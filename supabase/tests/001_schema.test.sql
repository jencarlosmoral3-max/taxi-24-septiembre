begin;
select plan(21);

select is((select count(*)::int from pg_tables where schemaname = 'public'), 12, '12 tablas en public');
select is(
  (select array_agg(c.relname::text order by c.relname) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null, 'RLS activada en todas las tablas de public');
select is((select count(*)::int from pg_policies where schemaname = 'public'), 0, 'sin políticas aún (deny-all, B-02)');

select has_index('public', 'rides', 'rides_one_open_per_passenger', 'índice 1 pedido abierto por pasajero');
select has_index('public', 'rides', 'rides_one_active_per_driver', 'índice 1 viaje activo por conductor');
select has_index('public', 'ride_offers', 'ride_offers_one_active_per_driver', 'índice 1 oferta activa por conductor y viaje');
select has_index('public', 'driver_locations', 'driver_locations_location_gist', 'GIST en ubicación');

insert into auth.users (id, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'P1'),
  ('00000000-0000-0000-0000-0000000000a2', 'P2'),
  ('00000000-0000-0000-0000-0000000000d1', 'D1');
insert into public.drivers (profile_id, status) values ('00000000-0000-0000-0000-0000000000d1', 'approved');

create function pg_temp.mk_ride(p uuid, st public.ride_status, d uuid default null, fare int default 1000) returns void
language sql as $$
  insert into public.rides (passenger_id, driver_id, origin, destination, offered_fare_cents, status, expires_at)
  values (p, d, 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', fare, st, now() + interval '5 min');
$$;

select lives_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a1', 'requested')$$, 'primer pedido abierto');
select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a1', 'requested')$$, '23505', null, 'segundo pedido abierto del mismo pasajero rechazado');
select lives_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a1', 'completed')$$, 'viajes cerrados no cuentan');

select lives_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a1', 'assigned', '00000000-0000-0000-0000-0000000000d1')$$, 'primer viaje activo del conductor');
select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a2', 'in_progress', '00000000-0000-0000-0000-0000000000d1')$$, '23505', null, 'segundo viaje activo del conductor rechazado');

select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a2', 'requested', null, 0)$$, '23514', null, 'tarifa ofrecida 0 rechazada');
select throws_ok($$select pg_temp.mk_ride('00000000-0000-0000-0000-0000000000a2', 'assigned', null)$$, '23514', null, 'viaje asignado sin conductor rechazado');

insert into public.ride_offers (ride_id, driver_id, price_cents, expires_at)
select id, '00000000-0000-0000-0000-0000000000d1', 1200, now() + interval '45 s'
  from public.rides where status = 'requested' limit 1;
select throws_ok($$insert into public.ride_offers (ride_id, driver_id, price_cents, expires_at)
  select id, '00000000-0000-0000-0000-0000000000d1', 1300, now() + interval '45 s' from public.rides where status = 'requested' limit 1$$,
  '23505', null, 'segunda oferta activa del conductor rechazada');
select lives_ok($$update public.ride_offers set status = 'withdrawn'$$, 'retirar oferta');
select lives_ok($$insert into public.ride_offers (ride_id, driver_id, price_cents, expires_at)
  select id, '00000000-0000-0000-0000-0000000000d1', 1300, now() + interval '45 s' from public.rides where status = 'requested' limit 1$$,
  'nueva oferta tras retirar la anterior');
select throws_ok($$update public.ride_offers set price_cents = 0 where status = 'active'$$, '23514', null, 'oferta de precio 0 rechazada');

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
