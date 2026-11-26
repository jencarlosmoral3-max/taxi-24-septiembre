-- Cuenta de prueba anónima (Supabase anonymous sign-in, APK demo): solo puede usar la Edge Function geo y leer su perfil.
-- No escribe datos reales (drivers/vehículos/documentos/storage), no dispara notificaciones ni SOS, y su consumo de geo
-- tiene topes propios para no agotar el cupo global de los usuarios reales.

-- 1. Helper: el claim is_anonymous del JWT (false si falta).
create function private.is_anon() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;
revoke all on function private.is_anon() from public, anon;
grant execute on function private.is_anon() to authenticated;

-- 2. Políticas RESTRICTIVE: se combinan con AND con las permisivas existentes; cubren toda tabla con escritura para authenticated.
do $$
declare
  t text;
  c text;
begin
  foreach t in array array['profiles', 'drivers', 'vehicles', 'driver_documents', 'app_config'] loop
    foreach c in array array['insert', 'update', 'delete'] loop
      -- profiles/app_config solo tienen grant de update; las políticas extra son inertes y cubren grants futuros.
      execute format(
        'create policy %I on public.%I as restrictive for %s to authenticated %s (not (select private.is_anon()))',
        'no_anon_' || c, t, c, case c when 'insert' then 'with check' else 'using' end);
    end loop;
  end loop;
end $$;
-- update restrictiva con using basta: sin with check explícito Postgres reutiliza using para las filas nuevas.

-- storage: ningún anónimo escribe en driver-docs.
create policy no_anon_driver_docs_insert on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'driver-docs' or not (select private.is_anon()));
create policy no_anon_driver_docs_update on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'driver-docs' or not (select private.is_anon()));
create policy no_anon_driver_docs_delete on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'driver-docs' or not (select private.is_anon()));

-- 3. Guarda en los RPC definer que escriben o notifican: se reescribe la definición vigente (pg_get_functiondef) insertando
-- la guarda tras el primer BEGIN (el del cuerpo; los BEGIN anidados van después). Atributos y grants se conservan.
do $$
declare
  f regprocedure;
  d text;
  n text;
begin
  foreach f in array array[
    'public.set_my_phone(text)',
    'public.create_ride(double precision, double precision, double precision, double precision, text, text, integer, smallint, text)',
    'public.get_nearby_requests()',
    'public.make_offer(uuid, integer)',
    'public.accept_offer(uuid)',
    'public.driver_arrived(uuid)',
    'public.start_ride(uuid)',
    'public.complete_ride(uuid)',
    'public.cancel_ride(uuid, text)',
    'public.rate_ride(uuid, smallint, text)',
    'public.trigger_sos(double precision, double precision, uuid, uuid)',
    'public.upsert_driver_location(double precision, double precision, real, real, boolean)'
  ]::regprocedure[] loop
    d := pg_get_functiondef(f);
    n := regexp_replace(d, '\mbegin\M',
      E'begin\n  if private.is_anon() then raise exception ''not_allowed'' using errcode = ''42501''; end if;', 'i');
    if n = d then
      raise exception 'guarda no insertada en %', f;
    end if;
    execute n;
  end loop;
end $$;

-- 4. Topes de geo: anónimo 30/día por usuario (resto 100) y global anónimo propio de 500/día sobre los créditos reales.
create table private.geo_usage_anon_global (
  day date primary key,
  hits integer not null default 0
);
alter table private.geo_usage_anon_global enable row level security;
revoke all on private.geo_usage_anon_global from public, anon, authenticated;

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
  if v_hits > (select case when private.is_anon() then 30 else 100 end) then -- por usuario y día
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.consume_geo_upstream_credit() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_hits integer;
begin
  if auth.uid() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- Tope por usuario: no más créditos globales que llamadas de cuota cobradas hoy, así el RPC directo no agota el global.
  update private.geo_usage_day set upstream = upstream + 1
  where user_id = auth.uid() and day = (now() at time zone 'utc')::date and upstream < hits;
  if not found then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  -- Los anónimos gastan además de un cupo propio (500/día): nunca consumen más que eso del global compartido.
  if private.is_anon() then
    insert into private.geo_usage_anon_global as g (day, hits) values ((now() at time zone 'utc')::date, 1)
    on conflict (day) do update set hits = g.hits + 1
    returning g.hits into v_hits;
    if v_hits > 500 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;
  insert into private.geo_usage_global as g (day, hits) values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update set hits = g.hits + 1
  returning g.hits into v_hits;
  if v_hits > 2700 then -- global por día, bajo los 3000 créditos del plan
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end $$;
