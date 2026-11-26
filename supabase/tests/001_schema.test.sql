begin;
select plan(38);

select is((select count(*)::int from pg_tables where schemaname = 'public'), 12, '12 tablas en public');
select is(
  (select array_agg(c.relname::text order by c.relname) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null, 'RLS activada en todas las tablas de public');
select is((select count(*)::int from pg_tables t where t.schemaname = 'public'
  and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)), 0, 'toda tabla de public tiene al menos una política (B-02)');

select has_index('public', 'rides', 'rides_one_open_per_passenger', 'índice 1 pedido abierto por pasajero');
select has_index('public', 'rides', 'rides_one_active_per_driver', 'índice 1 viaje activo por conductor');
select has_index('public', 'ride_offers', 'ride_offers_one_active_per_driver', 'índice 1 oferta activa por conductor y viaje');
select has_index('public', 'driver_locations', 'driver_locations_online_gist', 'GIST parcial de conductores online');

select has_index('public', 'ride_offers', 'ride_offers_one_accepted_per_ride', 'índice 1 oferta aceptada por viaje');

-- Privilegios: anon nada; authenticated solo select en rides (escrituras por RPC).
select ok(not has_table_privilege('anon', 'public.rides', 'select'), 'anon sin select en rides');
select ok(not has_table_privilege('authenticated', 'public.rides', 'insert'), 'authenticated sin insert en rides');
select ok(not has_table_privilege('authenticated', 'public.rides', 'update'), 'authenticated sin update en rides');
select ok(not has_table_privilege('authenticated', 'public.rides', 'delete'), 'authenticated sin delete en rides');
select ok(not has_table_privilege('authenticated', 'public.rides', 'truncate'), 'authenticated sin truncate en rides');
-- grantee 0 = PUBLIC
select is((select count(*)::int from pg_default_acl d, aclexplode(d.defaclacl) a
  where d.defaclrole = 'postgres'::regrole and d.defaclobjtype = 'f' and a.privilege_type = 'EXECUTE'
    and (d.defaclnamespace = 'public'::regnamespace or d.defaclnamespace = 0)
    and a.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)), 0, 'sin EXECUTE por defecto en funciones nuevas para public/anon/authenticated');
create function public.t_probe() returns int language sql as 'select 1';
select ok(not has_function_privilege('anon', 'public.t_probe()', 'execute'), 'una función nueva no es ejecutable por anon');

insert into auth.users (id, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'P1'),
  ('00000000-0000-0000-0000-0000000000a2', 'P2'),
  ('00000000-0000-0000-0000-0000000000a3', 'P3'),
  ('00000000-0000-0000-0000-0000000000a4', 'P4'),
  ('00000000-0000-0000-0000-0000000000d1', 'D1')
  on conflict (id) do update set full_name = excluded.full_name;
insert into public.drivers (profile_id, status) values ('00000000-0000-0000-0000-0000000000d1', 'approved');
insert into public.vehicles (id, driver_id, plate) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', '1234ABC');

-- Inserta directo (para probar checks sobre filas sueltas).
create function pg_temp.mk_ride(p uuid, st public.ride_status, d uuid default null, fare int default 1000) returns void
language sql as $$
  insert into public.rides (passenger_id, driver_id, origin, destination, offered_fare_cents, status, expires_at)
  values (p, d, 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', fare, st, now() + interval '5 min');
$$;

-- Camino legal: pedido requested -> oferta aceptada -> viaje en el estado pedido (driver d1, vehículo e1).
create function pg_temp.mk_full(p uuid, st public.ride_status, final int default 1000) returns void
language plpgsql as $$
declare r uuid; o uuid;
begin
  insert into public.rides (passenger_id, origin, destination, offered_fare_cents, expires_at)
  values (p, 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min') returning id into r;
  insert into public.ride_offers (ride_id, driver_id, price_cents, expires_at)
  values (r, '00000000-0000-0000-0000-0000000000d1', 1000, now() + interval '45 s') returning id into o;
  update public.ride_offers set status = 'accepted' where id = o;
  update public.rides set status = st, driver_id = '00000000-0000-0000-0000-0000000000d1', accepted_offer_id = o,
    vehicle_id = '00000000-0000-0000-0000-0000000000e1', final_fare_cents = final,
    completed_at = case when final is not null then now() end where id = r;
end $$;

select throws_ok($$insert into public.vehicles (driver_id, plate) values ('00000000-0000-0000-0000-0000000000d1', '1234-abc')$$, '23514', null, 'placa no normalizada rechazada');

select lives_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a1', 'requested')$$, 'primer pedido abierto');
select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a1', 'requested')$$, '23505', null, 'segundo pedido abierto del mismo pasajero rechazado');
select lives_ok($$select pg_temp.mk_full('00000000-0000-0000-0000-0000000000a3', 'completed')$$, 'viajes cerrados no cuentan');

select lives_ok($$select pg_temp.mk_full('00000000-0000-0000-0000-0000000000a3', 'assigned')$$, 'primer viaje activo del conductor');
select throws_ok($$select pg_temp.mk_full('00000000-0000-0000-0000-0000000000a2', 'in_progress')$$, '23505', null, 'segundo viaje activo del conductor rechazado');
select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a3', 'requested')$$, '23505', null, 'pasajero con viaje asignado no puede abrir otro pedido');

select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a2', 'requested', null, 0)$$, '23514', null, 'tarifa ofrecida 0 rechazada');
select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a2', 'assigned', null)$$, '23514', null, 'viaje asignado sin conductor rechazado');
select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a2', 'requested', '00000000-0000-0000-0000-0000000000d1')$$, '23514', null, 'pedido requested con conductor rechazado');
select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000d1', 'cancelled_passenger', '00000000-0000-0000-0000-0000000000d1')$$, '23514', null, 'conductor = pasajero rechazado');
select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a2', 'cancelled_driver')$$, '23514', null, 'cancelled_driver sin conductor rechazado');
select throws_ok($$select pg_temp.mk_full('00000000-0000-0000-0000-0000000000a4', 'completed', null)$$, '23514', null, 'completed sin tarifa final rechazado');

select throws_ok($$insert into public.ride_offers (ride_id, driver_id, price_cents, expires_at)
  select id, '00000000-0000-0000-0000-0000000000d1', 1200, now() + interval '45 s' from public.rides where status = 'assigned' limit 1$$,
  'P0001', null, 'oferta sobre un viaje no abierto rechazada');

insert into public.ride_offers (ride_id, driver_id, price_cents, expires_at)
select id, '00000000-0000-0000-0000-0000000000d1', 1200, now() + interval '45 s'
  from public.rides where status = 'requested' limit 1;
select throws_ok($$insert into public.ride_offers (ride_id, driver_id, price_cents, expires_at)
  select id, '00000000-0000-0000-0000-0000000000d1', 1300, now() + interval '45 s' from public.rides where status = 'requested' limit 1$$,
  '23505', null, 'segunda oferta activa del conductor rechazada');
select lives_ok($$update public.ride_offers set status = 'withdrawn' where status = 'active'$$, 'retirar oferta');
select lives_ok($$insert into public.ride_offers (ride_id, driver_id, price_cents, expires_at)
  select id, '00000000-0000-0000-0000-0000000000d1', 1300, now() + interval '45 s' from public.rides where status = 'requested' limit 1$$,
  'nueva oferta tras retirar la anterior');
select throws_ok($$update public.ride_offers set price_cents = 0 where status = 'active'$$, '23514', null, 'oferta de precio 0 rechazada');

select lives_ok($$insert into public.ride_offers (ride_id, driver_id, price_cents, status, expires_at)
  select id, '00000000-0000-0000-0000-0000000000d1', 1400, 'accepted', now() + interval '45 s' from public.rides where status = 'requested' limit 1$$,
  'primera oferta aceptada del viaje');
select throws_ok($$insert into public.ride_offers (ride_id, driver_id, price_cents, status, expires_at)
  select id, '00000000-0000-0000-0000-0000000000d1', 1500, 'accepted', now() + interval '45 s' from public.rides where status = 'requested' limit 1$$,
  '23505', null, 'segunda oferta aceptada del mismo viaje rechazada');

select throws_ok($$insert into public.ratings (ride_id, rater_id, ratee_id, stars)
  select id, '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 6 from public.rides limit 1$$,
  '23514', null, 'estrellas > 5 rechazadas');
select throws_ok($$insert into public.ratings (ride_id, rater_id, ratee_id, stars)
  select id, '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 0 from public.rides limit 1$$,
  '23514', null, 'estrellas 0 rechazadas');

select throws_ok($$insert into public.app_config (id, min_fare_cents, search_radius_m, ride_ttl_s, base_cents, per_km_cents, per_min_cents)
  values (false, 1, 1, 1, 0, 0, 0)$$, '23514', null, 'app_config solo admite id = true');

select * from finish();
rollback;
