begin;
select plan(45);

-- Usuarios: pasajeros a1, b1; conductores d1 (viaje R1 con a1), d2 (oferta rechazada en R2 de b1), d3 pendiente.
create function pg_temp.id(p text) returns uuid language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p)::uuid $$;
insert into auth.users (id, instance_id, aud, role, phone)
select pg_temp.id(p), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '591700' || lpad(n::text, 5, '0')
from unnest(array['a1','b1','d1','d2','d3','ad']) with ordinality as t(p, n);
insert into public.profiles (id, full_name) select pg_temp.id(p), 'U ' || p from unnest(array['a1','b1','d1','d2','d3','ad']) p
on conflict (id) do update set full_name = excluded.full_name;
insert into public.drivers (profile_id, status) values (pg_temp.id('d1'), 'approved'), (pg_temp.id('d2'), 'approved'), (pg_temp.id('d3'), 'pending');
insert into public.vehicles (driver_id, plate) values (pg_temp.id('d1'), '1111AAA');
-- R1: a1 + d1, assigned (camino legal: pedido -> oferta aceptada -> asignado). R2: b1 requested, oferta de d2 rechazada.
insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, expires_at) values
  (pg_temp.id('c1'), pg_temp.id('a1'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min'),
  (pg_temp.id('c2'), pg_temp.id('b1'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min');
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at) values
  (pg_temp.id('f1'), pg_temp.id('c1'), pg_temp.id('d1'), 1000, now() + interval '45 s'),
  (pg_temp.id('f2'), pg_temp.id('c2'), pg_temp.id('d2'), 1000, now() + interval '45 s');
update public.ride_offers set status = 'accepted' where id = pg_temp.id('f1');
update public.ride_offers set status = 'rejected' where id = pg_temp.id('f2');
update public.rides set status = 'assigned', driver_id = pg_temp.id('d1'), accepted_offer_id = pg_temp.id('f1'),
  vehicle_id = (select id from public.vehicles where driver_id = pg_temp.id('d1')) where id = pg_temp.id('c1');

create function pg_temp.login(u uuid, app_role text default null) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'app_metadata', json_build_object('role', app_role))::text, true);
  execute 'set local role authenticated';
end $$;
-- ¿Puede el usuario actual unirse (SELECT) / emitir (INSERT) en el topic? Simula realtime.topic() del servidor Realtime.
create function pg_temp.can_join(t text) returns boolean language plpgsql as $$
begin
  perform set_config('realtime.topic', t, true);
  return exists (select 1 from realtime.messages m where m.topic = t and m.extension = 'broadcast');
end $$;
create function pg_temp.can_send(t text) returns boolean language plpgsql as $$
begin
  perform set_config('realtime.topic', t, true);
  insert into realtime.messages (topic, extension, payload, event, private) values (t, 'broadcast', '{}', 'pos', true);
  return true;
exception when insufficient_privilege then return false;
end $$;
grant execute on function pg_temp.id(text), pg_temp.login(uuid, text), pg_temp.can_join(text), pg_temp.can_send(text) to public;

-- Mensajes de prueba (los emite el servidor).
insert into realtime.messages (topic, extension, payload, event, private)
select t, 'broadcast', '{}', 'x', true from unnest(array[
  'driver:' || pg_temp.id('d1'), 'driver:' || pg_temp.id('d2'), 'driver:' || pg_temp.id('a1'),
  'rider:' || pg_temp.id('a1'), 'rider:' || pg_temp.id('b1'), 'trip:' || pg_temp.id('c1'), 'trip:' || pg_temp.id('c2')]) t;

-- SELECT (unirse)
select pg_temp.login(pg_temp.id('d1'));
select ok(pg_temp.can_join('driver:' || pg_temp.id('d1')), 'conductor se une a su driver:');
select ok(not pg_temp.can_join('driver:' || pg_temp.id('d2')), 'conductor no se une al driver: de otro');
select ok(not pg_temp.can_join('rider:' || pg_temp.id('a1')), 'conductor no se une al rider: ajeno');
select ok(pg_temp.can_join('trip:' || pg_temp.id('c1')), 'conductor asignado se une a trip: activo');
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c2')), 'conductor ajeno no se une a trip: de otro viaje');
select ok(not pg_temp.can_join('driver:' || pg_temp.id('d1') || 'x') and not pg_temp.can_join('driver:%'), 'igualdad exacta: sin prefijos ni comodines');
select pg_temp.login(pg_temp.id('a1'));
select ok(pg_temp.can_join('rider:' || pg_temp.id('a1')), 'pasajero se une a su rider:');
select ok(not pg_temp.can_join('rider:' || pg_temp.id('b1')), 'pasajero no se une al rider: de otro');
select ok(not pg_temp.can_join('driver:' || pg_temp.id('a1')), 'no-conductor no se une a driver:<su uid>');
select ok(pg_temp.can_join('trip:' || pg_temp.id('c1')), 'pasajero se une a su trip: activo');
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c2')), 'conocer el id del viaje ajeno no basta');
select pg_temp.login(pg_temp.id('b1'));
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c2')), 'pasajero no se une a trip: mientras el pedido solo está requested');
select pg_temp.login(pg_temp.id('d2'));
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c2')), 'oferente rechazado no se une a trip:');
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c1')), 'oferente rechazado no se une al trip: de otro viaje');
reset role;
set local role anon;
select ok(not pg_temp.can_join('rider:' || pg_temp.id('a1')), 'anon no se une a nada');
reset role;

-- INSERT (emitir)
select pg_temp.login(pg_temp.id('d1'));
select ok(not pg_temp.can_send('driver:' || pg_temp.id('d2')), 'cliente no emite en driver:');
select ok(not pg_temp.can_send('driver:' || pg_temp.id('d1')), 'ni siquiera en su propio driver:');
select ok(not pg_temp.can_send('rider:' || pg_temp.id('a1')), 'cliente no emite en rider:');
select ok(pg_temp.can_send('trip:' || pg_temp.id('c1')), 'conductor asignado emite en trip: activo');
select ok(not pg_temp.can_send('trip:' || pg_temp.id('c2')), 'conductor no emite en trip: ajeno');
select pg_temp.login(pg_temp.id('a1'));
select ok(not pg_temp.can_send('trip:' || pg_temp.id('c1')), 'pasajero no emite en trip:');
reset role;
update public.rides set status = 'in_progress', started_at = now() where id = pg_temp.id('c1');
update public.rides set status = 'completed', completed_at = now(), final_fare_cents = 1000 where id = pg_temp.id('c1');
select pg_temp.login(pg_temp.id('d1'));
select ok(not pg_temp.can_send('trip:' || pg_temp.id('c1')), 'conductor no emite en trip: cerrado');
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c1')), 'conductor no se une a trip: cerrado');
select pg_temp.login(pg_temp.id('a1'));
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c1')), 'pasajero no se une a trip: cerrado');
reset role;

-- upsert_driver_location
select ok(has_function_privilege('authenticated', 'public.upsert_driver_location(double precision,double precision,real,real,boolean)', 'execute')
  and not has_function_privilege('anon', 'public.upsert_driver_location(double precision,double precision,real,real,boolean)', 'execute'), 'privilegios de upsert_driver_location');
-- r3: viaje activo nuevo de d2 para probar busy/track (R1 ya cerró).
insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, expires_at)
values (pg_temp.id('c3'), pg_temp.id('a1'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok($$select public.upsert_driver_location(-63.18, -17.78, 90, 30)$$, 'conductor aprobado reporta ubicación');
select is((select count(*)::int from public.driver_locations where driver_id = pg_temp.id('d1') and is_online), 1, 'una fila online');
select lives_ok($$select public.upsert_driver_location(-63.181, -17.78, 90, 30)$$, 'movimiento pequeño (~100 m) aceptado');
select is((select count(*)::int from public.driver_locations where driver_id = pg_temp.id('d1')), 1, 'sigue habiendo una sola fila');
select throws_ok($$select public.upsert_driver_location(-62.5, -17.78)$$, 'P0001', 'implausible_location', 'salto de ~75 km rechazado');
select throws_ok($$select public.upsert_driver_location(-63.18, 95)$$, 'P0001', 'invalid_coordinates', 'latitud inválida rechazada');
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78, 400)$$, 'P0001', 'invalid_input', 'rumbo inválido rechazado');
select pg_temp.login(pg_temp.id('d3'));
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78)$$, '42501', 'not_allowed', 'conductor no aprobado rechazado');
select pg_temp.login(pg_temp.id('a1'));
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78)$$, '42501', 'not_allowed', 'no-conductor rechazado');
select pg_temp.login(pg_temp.id('d2'));
select lives_ok($$select public.upsert_driver_location(-63.18, -17.78, null, null, false)$$, 'sin viaje activo puede pasar a offline');
select is((select is_online from public.driver_locations where driver_id = pg_temp.id('d2')), false, 'queda offline');
reset role;
-- d1 con viaje activo (r3 asignado a d1): no puede pasar a offline; en in_progress se acumulan puntos con límite de 1 por 5 s.
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at) values (pg_temp.id('f3'), pg_temp.id('c3'), pg_temp.id('d1'), 1000, now() + interval '45 s');
update public.ride_offers set status = 'accepted' where id = pg_temp.id('f3');
update public.rides set status = 'assigned', driver_id = pg_temp.id('d1'), accepted_offer_id = pg_temp.id('f3'),
  vehicle_id = (select id from public.vehicles where driver_id = pg_temp.id('d1')) where id = pg_temp.id('c3');
select pg_temp.login(pg_temp.id('d1'));
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78, null, null, false)$$, 'P0001', 'driver_busy', 'offline con viaje activo rechazado');
select lives_ok($$select public.upsert_driver_location(-63.1805, -17.78)$$, 'assigned: actualiza ubicación');
select is((select count(*)::int from public.ride_track_points where ride_id = pg_temp.id('c3')), 0, 'assigned: no se guarda historial');
reset role;
update public.rides set status = 'in_progress', started_at = now() where id = pg_temp.id('c3');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok($$select public.upsert_driver_location(-63.181, -17.78)$$, 'in_progress: reporta');
select is((select count(*)::int from public.ride_track_points where ride_id = pg_temp.id('c3')), 1, 'in_progress: punto agregado');
select lives_ok($$select public.upsert_driver_location(-63.1815, -17.78)$$, 'segundo reporte inmediato');
select is((select count(*)::int from public.ride_track_points where ride_id = pg_temp.id('c3')), 1, 'límite: sin segundo punto antes de 5 s');
reset role;
update public.ride_track_points set recorded_at = recorded_at - interval '10 seconds' where ride_id = pg_temp.id('c3');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok($$select public.upsert_driver_location(-63.182, -17.78)$$, 'reporte pasados 5 s');
select is((select count(*)::int from public.ride_track_points where ride_id = pg_temp.id('c3')), 2, 'pasados 5 s se agrega otro punto');
reset role;

select * from finish();
rollback;
