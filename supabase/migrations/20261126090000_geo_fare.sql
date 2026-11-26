-- Vyro B-13 (tarifa sugerida) + B-12 (cuota de uso del proxy geo).

-- B-13: base + per_km*km + per_min*min (app_config), redondeada hacia arriba a Bs enteros, nunca menor al mínimo.
-- SECURITY INVOKER: app_config ya es legible para authenticated (RLS).
create function public.suggest_fare(p_distance_m integer, p_duration_s integer)
returns integer language plpgsql stable set search_path = '' as $$
declare
  c public.app_config;
  v_cents numeric;
begin
  if p_distance_m is null or p_duration_s is null or p_distance_m < 0 or p_duration_s < 0
     or p_distance_m > 200000 or p_duration_s > 21600 then
    raise exception 'invalid_route' using errcode = 'P0001';
  end if;
  select * into c from public.app_config where id;
  v_cents := c.base_cents + c.per_km_cents * (p_distance_m / 1000.0) + c.per_min_cents * (p_duration_s / 60.0);
  return greatest(ceil(v_cents / 100) * 100, c.min_fare_cents)::integer;
end $$;
revoke all on function public.suggest_fare(integer, integer) from public, anon;
grant execute on function public.suggest_fare(integer, integer) to authenticated;

-- B-12: rate limit por usuario (ventana fija de 10 min, 60 llamadas). Tabla sin grants: solo la función definer la toca.
create table private.geo_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (user_id, window_start)
);
alter table private.geo_usage enable row level security;
revoke all on private.geo_usage from public, anon, authenticated;

create function public.consume_geo_quota() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_win timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  v_hits integer;
begin
  if v_uid is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  delete from private.geo_usage where user_id = v_uid and window_start < v_win; -- limpieza oportunista
  insert into private.geo_usage as g (user_id, window_start, hits) values (v_uid, v_win, 1)
  on conflict (user_id, window_start) do update set hits = g.hits + 1
  returning g.hits into v_hits;
  if v_hits > 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.consume_geo_quota() from public, anon;
grant execute on function public.consume_geo_quota() to authenticated;
