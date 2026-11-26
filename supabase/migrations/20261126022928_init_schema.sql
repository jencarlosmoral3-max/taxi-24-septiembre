-- Vyro: esquema inicial (B-01). RLS activada en todo y SIN políticas (deny-all); las políticas van en B-02.
-- pg_cron NO se habilita aquí: se crea junto con los jobs de expiración en B-09.
-- Privilegios: esta migración revoca TODO a anon/authenticated (tablas, secuencias, funciones, defaults).
-- Los grants son explícitos por tabla/columna/función desde B-02 en adelante.
-- Anonimización: auth.users NUNCA se borra (se anonimiza: teléfono null en auth + ban, PII null en nuestras tablas),
-- por eso todas las FKs a personas/viajes son on delete restrict.
-- Rol: no hay enum user_role ni profiles.role. Admin viene del claim del JWT; "conductor" = existe fila en drivers.

create extension if not exists postgis with schema extensions;

create type public.ride_status as enum (
  'requested', 'assigned', 'driver_arrived', 'in_progress', 'completed',
  'cancelled_passenger', 'cancelled_driver', 'expired');
create type public.offer_status as enum ('active', 'accepted', 'rejected', 'expired', 'withdrawn');
create type public.driver_status as enum ('pending', 'approved', 'suspended', 'rejected');
create type public.document_type as enum (
  'license', 'ci_front', 'ci_back', 'ruat', 'soat', 'vehicle_photo', 'selfie');
create type public.document_status as enum ('pending', 'approved', 'rejected');

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Dinero: siempre centavos de Bs (integer).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  full_name text,
  avatar_path text,
  rating_avg numeric(3,2) check (rating_avg is null or rating_avg between 1 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table public.profiles is 'Perfil de cada usuario (id = auth.users.id). deleted_at marca cuentas anonimizadas.
Anonimizar = auth.users se conserva (phone null + ban) y aquí se nulifican full_name, avatar_path y push_token; las FKs son restrict, nunca se borra. El teléfono vive solo en auth.users.';

create table public.drivers (
  profile_id uuid primary key references public.profiles (id) on delete restrict,
  status public.driver_status not null default 'pending',
  union_member_number text unique check (union_member_number = btrim(union_member_number)),
  license_number text,
  ci_number text,
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.drivers is 'Datos del conductor y estado de aprobación del sindicato.';

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (profile_id) on delete restrict,
  plate text not null unique check (plate = upper(regexp_replace(plate, '[\s-]', '', 'g'))),
  brand text,
  model text,
  color text,
  year smallint check (year between 1980 and 2100),
  ruat text,
  soat_expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_driver_id_idx on public.vehicles (driver_id);
comment on table public.vehicles is 'Vehículo del conductor.';

create table public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (profile_id) on delete restrict,
  type public.document_type not null,
  storage_path text not null,
  status public.document_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);
create index driver_documents_driver_id_idx on public.driver_documents (driver_id);
create index driver_documents_reviewed_by_idx on public.driver_documents (reviewed_by);
create unique index driver_documents_one_current_per_type on public.driver_documents (driver_id, type) where status in ('pending', 'approved');
comment on table public.driver_documents is 'Documentos subidos por el conductor (archivo en bucket privado driver-docs).';

create table public.driver_locations (
  driver_id uuid primary key references public.drivers (profile_id) on delete cascade,
  location extensions.geography(Point, 4326) not null,
  heading real,
  speed real,
  is_online boolean not null default false,
  updated_at timestamptz not null default now()
);
-- GIST parcial solo de los online. B-17 medirá GIST parcial vs sin índice (los updates HOT dependen de no indexar location).
create index driver_locations_online_gist on public.driver_locations using gist (location) where is_online;
alter table public.driver_locations set (fillfactor = 50, autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 500,
  autovacuum_analyze_scale_factor = 0, autovacuum_analyze_threshold = 500, autovacuum_vacuum_cost_delay = 0);
comment on table public.driver_locations is 'Última ubicación del conductor: UNA fila por conductor (upsert).';

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles (id) on delete restrict,
  driver_id uuid references public.drivers (profile_id) on delete restrict,
  vehicle_id uuid references public.vehicles (id) on delete restrict,
  accepted_offer_id uuid, -- FK rides_accepted_offer_fk más abajo (ride_offers se crea después)
  origin extensions.geography(Point, 4326) not null,
  destination extensions.geography(Point, 4326) not null,
  origin_text text,
  destination_text text,
  offered_fare_cents integer not null check (offered_fare_cents > 0),
  final_fare_cents integer check (final_fare_cents > 0),
  passenger_count smallint not null default 1 check (passenger_count between 1 and 8),
  comment text,
  status public.ride_status not null default 'requested',
  expires_at timestamptz not null,
  assigned_at timestamptz,
  driver_arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  check (status <> 'requested' or (driver_id is null and accepted_offer_id is null)),
  check (status not in ('assigned', 'driver_arrived', 'in_progress', 'completed', 'cancelled_driver')
    or (driver_id is not null and accepted_offer_id is not null)),
  check (driver_id is null or driver_id <> passenger_id),
  check (status <> 'completed' or (final_fare_cents is not null and completed_at is not null)),
  check (expires_at > created_at)
);
create unique index rides_one_open_per_passenger on public.rides (passenger_id)
  where status in ('requested', 'assigned', 'driver_arrived', 'in_progress');
create unique index rides_one_active_per_driver on public.rides (driver_id)
  where status in ('assigned', 'driver_arrived', 'in_progress');
create index rides_passenger_created_idx on public.rides (passenger_id, created_at desc);
create index rides_driver_created_idx on public.rides (driver_id, created_at desc) where driver_id is not null;
create index rides_requested_expires_idx on public.rides (expires_at) where status = 'requested';
create index rides_requested_origin_gist on public.rides using gist (origin) where status = 'requested';
create index rides_vehicle_id_idx on public.rides (vehicle_id);
create index rides_accepted_offer_id_idx on public.rides (accepted_offer_id);
comment on table public.rides is 'Viajes. Estado manejado solo por RPC; tarifas en centavos de Bs.';

create table public.ride_offers (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete restrict,
  driver_id uuid not null references public.drivers (profile_id) on delete restrict,
  price_cents integer not null check (price_cents > 0),
  status public.offer_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index ride_offers_one_active_per_driver on public.ride_offers (ride_id, driver_id) where status = 'active';
create unique index ride_offers_one_accepted_per_ride on public.ride_offers (ride_id) where status = 'accepted';
create index ride_offers_driver_idx on public.ride_offers (driver_id);
create index ride_offers_ride_idx on public.ride_offers (ride_id, created_at);
create index ride_offers_active_expires_idx on public.ride_offers (expires_at) where status = 'active';
comment on table public.ride_offers is 'Ofertas de conductores sobre un pedido (puja).';

alter table public.rides add constraint rides_accepted_offer_fk
  foreign key (accepted_offer_id) references public.ride_offers (id) on delete restrict;

-- Solo se oferta sobre pedidos abiertos; for share evita que el pedido cambie de estado durante el insert.
create function public.check_ride_open_for_offer() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.rides r where r.id = new.ride_id and r.status = 'requested' and r.expires_at > now() for share;
  if not found then
    raise exception 'ride not open' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger ride_offers_check_open before insert on public.ride_offers
  for each row execute function public.check_ride_open_for_offer();

create table public.ride_track_points (
  ride_id uuid not null references public.rides (id) on delete restrict,
  recorded_at timestamptz not null,
  location extensions.geography(Point, 4326) not null,
  primary key (ride_id, recorded_at)
);
comment on table public.ride_track_points is 'Puntos GPS solo durante viajes en curso (insert por lotes).';

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete restrict,
  rater_id uuid not null references public.profiles (id) on delete restrict,
  ratee_id uuid not null references public.profiles (id) on delete restrict,
  stars smallint not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (ride_id, rater_id),
  check (rater_id <> ratee_id)
);
create index ratings_ratee_idx on public.ratings (ratee_id);
create index ratings_rater_idx on public.ratings (rater_id);
comment on table public.ratings is 'Calificación mutua por viaje (una por calificador).';

create table public.sos_events (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  location extensions.geography(Point, 4326),
  created_at timestamptz not null default now(),
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz
);
create index sos_events_user_idx on public.sos_events (user_id);
create index sos_events_ride_idx on public.sos_events (ride_id);
create index sos_events_unhandled_idx on public.sos_events (created_at) where handled_at is null;
comment on table public.sos_events is 'Alertas SOS; las atiende un admin.';

-- VALORES PLACEHOLDER: la tarifa mínima, el radio y la fórmula sugerida se confirman con el sindicato.
create table public.app_config (
  id boolean primary key default true check (id),
  min_fare_cents integer not null check (min_fare_cents > 0),
  search_radius_m integer not null check (search_radius_m > 0),
  offer_ttl_s integer not null default 45 check (offer_ttl_s > 0),
  ride_ttl_s integer not null check (ride_ttl_s > 0),
  base_cents integer not null check (base_cents >= 0),
  per_km_cents integer not null check (per_km_cents >= 0),
  per_min_cents integer not null check (per_min_cents >= 0),
  updated_at timestamptz not null default now()
);
insert into public.app_config (min_fare_cents, search_radius_m, offer_ttl_s, ride_ttl_s, base_cents, per_km_cents, per_min_cents)
values (1000, 3000, 45, 300, 500, 300, 50); -- placeholders (Bs 10 mínimo, 3 km, etc.)
comment on table public.app_config is 'Configuración global: una sola fila (id = true).';

create table public.config_audit (
  id bigint generated always as identity primary key,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  old jsonb,
  new jsonb
);
comment on table public.config_audit is 'Historial de cambios de app_config.';
create index config_audit_changed_by_idx on public.config_audit (changed_by);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger drivers_updated_at before update on public.drivers for each row execute function public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger app_config_updated_at before update on public.app_config for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_documents enable row level security;
alter table public.driver_locations enable row level security;
alter table public.rides enable row level security;
alter table public.ride_offers enable row level security;
alter table public.ride_track_points enable row level security;
alter table public.ratings enable row level security;
alter table public.sos_events enable row level security;
alter table public.app_config enable row level security;
alter table public.config_audit enable row level security;

-- Privilegios: nada para anon/authenticated hasta B-02 (grants explícitos). service_role y postgres conservan los suyos.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
-- El REVOKE ... IN SCHEMA no quita el EXECUTE a PUBLIC que Postgres da por defecto a toda función nueva; solo el global lo quita.
alter default privileges for role postgres revoke execute on functions from public;
