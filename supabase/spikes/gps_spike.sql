-- Spike F-06 (IND-6). SOLO Supabase local; nunca va a migrations/ ni a produccion.
create table if not exists public.spike_gps_points (
  id bigint generated always as identity primary key,
  device text not null,
  phase text not null,
  seq integer not null,
  recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  accuracy double precision
);
alter table public.spike_gps_points enable row level security;
drop policy if exists spike_gps_insert on public.spike_gps_points;
create policy spike_gps_insert on public.spike_gps_points for insert to anon with check (true);
grant insert on public.spike_gps_points to anon;
