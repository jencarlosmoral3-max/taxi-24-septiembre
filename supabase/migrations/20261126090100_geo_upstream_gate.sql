-- B-12/B-13 endurecimiento: aritmética entera en suggest_fare y compuerta global de 1 req/s hacia proveedores OSM.

-- cents = base + per_km*dist_m/1000 + per_min*dur_s/60. Multiplicado por 60000 queda todo entero; /6000000 = Bs, ceil = Bs enteros hacia arriba.
create or replace function public.suggest_fare(p_distance_m integer, p_duration_s integer)
returns integer language plpgsql stable set search_path = '' as $$
declare
  c public.app_config;
begin
  if p_distance_m is null or p_duration_s is null or p_distance_m < 0 or p_duration_s < 0
     or p_distance_m > 200000 or p_duration_s > 21600 then
    raise exception 'invalid_route' using errcode = 'P0001';
  end if;
  select * into c from public.app_config where id;
  if not found then
    raise exception 'config_missing' using errcode = 'P0001';
  end if;
  return greatest(
    ceil((c.base_cents::bigint * 60000 + c.per_km_cents::bigint * p_distance_m * 60 + c.per_min_cents::bigint * p_duration_s * 1000) / 6000000.0) * 100,
    c.min_fare_cents)::integer;
end $$;

-- Compuerta global (no por usuario): Nominatim exige máx. 1 req/s en total, y OSRM público también se protege.
create table private.geo_upstream (
  provider text primary key,
  last_call timestamptz not null default '-infinity'
);
alter table private.geo_upstream enable row level security;
revoke all on private.geo_upstream from public, anon, authenticated;

create function public.geo_upstream_slot(p_provider text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_last timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_provider is null or p_provider not in ('nominatim', 'osrm') then
    raise exception 'invalid_provider' using errcode = 'P0001';
  end if;
  insert into private.geo_upstream (provider) values (p_provider) on conflict do nothing;
  select g.last_call into v_last from private.geo_upstream g where g.provider = p_provider for update;
  if clock_timestamp() - v_last >= interval '1 second' then
    update private.geo_upstream set last_call = clock_timestamp() where provider = p_provider;
    return true;
  end if;
  return false;
end $$;
revoke all on function public.geo_upstream_slot(text) from public, anon;
grant execute on function public.geo_upstream_slot(text) to authenticated;
