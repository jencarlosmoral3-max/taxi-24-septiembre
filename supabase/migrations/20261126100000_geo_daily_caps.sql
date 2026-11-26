-- Geoapify plan gratis: 3000 créditos/día; superarlo = rechazo para todos.
-- consume_geo_quota: solo topes por usuario (60 / 10 min y 100 / día; con 100/día hacen falta >= 27 cuentas para agotar el global).
-- consume_geo_upstream_credit: tope global (2700/día UTC) que la Edge Function cobra justo antes de cada llamada real a Geoapify
-- (no en caché, entradas inválidas ni rutas rechazadas). Mismo error rate_limited -> 429.
-- No verificado: la hora exacta en que Geoapify reinicia su cuota diaria; el tope global deja margen (2700 de 3000).
-- Un rechazo lanza excepción y revierte el RPC completo: las llamadas rechazadas no cuentan en ningún contador.

create table private.geo_usage_day (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  hits integer not null default 0,
  primary key (user_id, day)
);
alter table private.geo_usage_day enable row level security;
revoke all on private.geo_usage_day from public, anon, authenticated;

create table private.geo_usage_global (
  day date primary key,
  hits integer not null default 0
);
alter table private.geo_usage_global enable row level security;
revoke all on private.geo_usage_global from public, anon, authenticated;

create or replace function public.consume_geo_quota() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_win timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  v_day date := (now() at time zone 'utc')::date;
  v_hits integer;
begin
  if v_uid is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  delete from private.geo_usage where user_id = v_uid and window_start < v_win; -- limpieza oportunista
  delete from private.geo_usage_day where user_id = v_uid and day < v_day;

  insert into private.geo_usage as g (user_id, window_start, hits) values (v_uid, v_win, 1)
  on conflict (user_id, window_start) do update set hits = g.hits + 1
  returning g.hits into v_hits;
  if v_hits > 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into private.geo_usage_day as g (user_id, day, hits) values (v_uid, v_day, 1)
  on conflict (user_id, day) do update set hits = g.hits + 1
  returning g.hits into v_hits;
  if v_hits > 100 then -- por usuario y día
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.consume_geo_quota() from public, anon;
grant execute on function public.consume_geo_quota() to authenticated;

-- Sin limpieza de días viejos: es una fila por día.
create function public.consume_geo_upstream_credit() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_hits integer;
begin
  if auth.uid() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into private.geo_usage_global as g (day, hits) values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update set hits = g.hits + 1
  returning g.hits into v_hits;
  if v_hits > 2700 then -- global por día, bajo los 3000 créditos del plan
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.consume_geo_upstream_credit() from public, anon;
grant execute on function public.consume_geo_upstream_credit() to authenticated;

-- La compuerta 1 req/s ya no se usa (era para Nominatim/OSRM públicos).
drop function public.geo_upstream_slot(text);
drop table private.geo_upstream;
