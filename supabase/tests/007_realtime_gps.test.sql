begin;
select plan(55);

-- Usuarios: pasajeros a1, b1; conductores d1 (viaje R1 con a1), d2 (oferta rechazada en R2 de b1), d3 pendiente.
create function pg_temp.id(p text) returns uuid language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p)::uuid $$;
insert into auth.users (id, instance_id, aud, role, phone)
select pg_temp.id(p), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '591700' || lpad(n::text, 5, '0')
from unnest(array['a1','b1','d1','d2','d3','d4','ad']) with ordinality as t(p, n);
insert into public.profiles (id, full_name) select pg_temp.id(p), 'U ' || p from unnest(array['a1','b1','d1','d2','d3','d4','ad']) p
on conflict (id) do update set full_name = excluded.full_name;
insert into public.drivers (profile_id, status) values (pg_temp.id('d1'), 'approved'), (pg_temp.id('d2'), 'approved'), (pg_temp.id('d3'), 'pending'), (pg_temp.id('d4'), 'suspended');
insert into public.vehicles (driver_id, plate) values (pg_temp.id('d1'), '1111AAA');
-- R1: a1 + d1, assigned (camino legal: pedido -> oferta aceptada -> asignado). R2: b1 requested, oferta de d2 rechazada.
insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, expires_at) values
  (pg_temp.id('c1'), pg_temp.id('a1'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min'),
  (pg_temp.id('c2'), pg_temp.id('b1'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min');
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at) values
  (pg_temp.id('f1'), pg_temp.id('c1'), pg_temp.id('d1'), 1000, now() + interval '45 s'),
  (pg_temp.id('f3'), pg_temp.id('c1'), pg_temp.id('d2'), 1000, now() + interval '45 s'),
  (pg_temp.id('f2'), pg_temp.id('c2'), pg_temp.id('d2'), 1000, now() + interval '45 s');
update public.ride_offers set status = 'accepted' where id = pg_temp.id('f1');
update public.ride_offers set status = 'rejected' where id in (pg_temp.id('f2'), pg_temp.id('f3'));
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
  return exists (select 1 from realtime.messages m where m.extension = 'broadcast');
end $$;
create function pg_temp.can_send(t text) returns boolean language plpgsql as $$
begin
  perform set_config('realtime.topic', t, true);
  insert into realtime.messages (topic, extension, payload, event, private) values (t, 'broadcast', '{}', 'pos', true);
  return true;
exception when insufficient_privilege then return false;
end $$;
create function pg_temp.can_join_presence(t text) returns boolean language plpgsql as $$
begin
  perform set_config('realtime.topic', t, true);
  return exists (select 1 from realtime.messages m where m.extension = 'presence');
end $$;
grant execute on function pg_temp.can_join_presence(text) to public;
grant execute on function pg_temp.id(text), pg_temp.login(uuid, text), pg_temp.can_join(text), pg_temp.can_send(text) to public;

-- Mensajes sembrados (los emite el servidor): hay filas broadcast y una presence, así que "no ve nada" es significativo.
insert into realtime.messages (topic, extension, payload, event, private)
select 'seed:' || g, 'broadcast', '{}', 'x', true from generate_series(1, 3) g;
insert into realtime.messages (topic, extension, payload, event, private) values ('rider:' || pg_temp.id('a1'), 'presence', '{}', 'x', true);

-- SELECT (unirse)
select pg_temp.login(pg_temp.id('d1'));
select ok(pg_temp.can_join('driver:' || pg_temp.id('d1')), 'conductor aprobado se une a su driver:');
select ok(not pg_temp.can_join('driver:' || pg_temp.id('d2')), 'conductor no se une al driver: de otro');
select ok(not pg_temp.can_join('rider:' || pg_temp.id('a1')), 'conductor no se une al rider: ajeno');
select ok(pg_temp.can_join('trip:' || pg_temp.id('c1')), 'conductor asignado se une a trip: activo');
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c2')), 'conductor ajeno no se une a trip: de otro viaje');
select ok(not pg_temp.can_join('driver:' || pg_temp.id('d1') || 'x') and not pg_temp.can_join('driver:%') and not pg_temp.can_join('driver:'), 'igualdad exacta: sin prefijos ni comodines');
select pg_temp.login(pg_temp.id('d3'));
select ok(not pg_temp.can_join('driver:' || pg_temp.id('d3')), 'conductor pendiente no se une a su driver:');
select pg_temp.login(pg_temp.id('d4'));
select ok(not pg_temp.can_join('driver:' || pg_temp.id('d4')), 'conductor suspendido no se une a su driver:');
select pg_temp.login(pg_temp.id('a1'));
select ok(pg_temp.can_join('rider:' || pg_temp.id('a1')), 'pasajero se une a su rider:');
select ok(not pg_temp.can_join_presence('rider:' || pg_temp.id('a1')), 'filas presence no visibles (solo broadcast)');
select ok(not pg_temp.can_join('rider:' || pg_temp.id('b1')), 'pasajero no se une al rider: de otro');
select ok(not pg_temp.can_join('driver:' || pg_temp.id('a1')), 'no-conductor no se une a driver:<su uid>');
select ok(pg_temp.can_join('trip:' || pg_temp.id('c1')), 'pasajero se une a su trip: activo');
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c2')), 'conocer el id del viaje ajeno no basta');
select pg_temp.login(pg_temp.id('b1'));
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c2')), 'pasajero no se une a trip: mientras el pedido solo está requested');
select pg_temp.login(pg_temp.id('d2'));
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c1')), 'oferente rechazado no se une al trip: de un viaje asignado a otro');
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c2')), 'oferente rechazado no se une a trip: del pedido');
reset role;
set local role anon;
select ok(not pg_temp.can_join('rider:' || pg_temp.id('a1')), 'anon no se une a nada');
reset role;

-- INSERT: ningún cliente escribe en ningún topic
select pg_temp.login(pg_temp.id('d1'));
select ok(not pg_temp.can_send('driver:' || pg_temp.id('d1')), 'cliente no emite en driver:');
select ok(not pg_temp.can_send('rider:' || pg_temp.id('a1')), 'cliente no emite en rider:');
select ok(not pg_temp.can_send('trip:' || pg_temp.id('c1')), 'ni el conductor asignado emite en trip:');
select ok(not pg_temp.can_send('admin:sos'), 'cliente no emite en admin:sos');
select pg_temp.login(pg_temp.id('a1'));
select ok(not pg_temp.can_send('trip:' || pg_temp.id('c1')), 'pasajero no emite en trip:');
reset role;

-- upsert_driver_location
select ok(has_function_privilege('authenticated', 'public.upsert_driver_location(double precision,double precision,real,real,boolean)', 'execute')
  and not has_function_privilege('anon', 'public.upsert_driver_location(double precision,double precision,real,real,boolean)', 'execute'), 'privilegios de upsert_driver_location');
select pg_temp.login(pg_temp.id('d3'));
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78)$$, '42501', 'not_allowed', 'conductor pendiente rechazado');
select pg_temp.login(pg_temp.id('d4'));
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78)$$, '42501', 'not_allowed', 'conductor suspendido rechazado');
select pg_temp.login(pg_temp.id('a1'));
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78)$$, '42501', 'not_allowed', 'no-conductor rechazado');
select pg_temp.login(pg_temp.id('d1'));
select throws_ok($$select public.upsert_driver_location(-63.18, 95)$$, 'P0001', 'invalid_coordinates', 'latitud inválida rechazada');
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78, 400)$$, 'P0001', 'invalid_input', 'rumbo inválido rechazado');
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78, null, 150)$$, 'P0001', 'invalid_input', 'velocidad > 100 m/s rechazada');
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78, null, 'NaN'::real)$$, 'P0001', 'invalid_input', 'velocidad NaN rechazada');
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78, null, 'Infinity'::real)$$, 'P0001', 'invalid_input', 'velocidad Infinity rechazada');
select throws_ok($$select public.upsert_driver_location(-63.18, -17.78, null, null, false)$$, 'P0001', 'driver_busy', 'offline con viaje activo rechazado');
-- d1 con c1 asignado: primera posición.
select lives_ok($$select public.upsert_driver_location(-63.18, -17.78, 90, 30)$$, 'conductor aprobado reporta ubicación');
select is((select count(*)::int from public.driver_locations where driver_id = pg_temp.id('d1') and is_online), 1, 'una fila online');
-- Pasos chicos y rápidos: se ignoran y NO mueven el ancla (20 pasos de ~100 m = 2 km acumulados).
select lives_ok($$select public.upsert_driver_location(-63.18 - g * 0.001, -17.78) from generate_series(1, 20) g$$, 'pasos rápidos ignorados sin error');
reset role;
select is((select extensions.st_x(location::extensions.geometry) from public.driver_locations where driver_id = pg_temp.id('d1')), -63.18::float8, 'el ancla no se movió con pasos rápidos');
update public.driver_locations set updated_at = now() - interval '10 seconds' where driver_id = pg_temp.id('d1');
select pg_temp.login(pg_temp.id('d1'));
select throws_ok($$select public.upsert_driver_location(-62.5, -17.78)$$, 'P0001', 'implausible_location', 'salto de ~70 km en 10 s rechazado');
select lives_ok($$select public.upsert_driver_location(-63.1805, -17.78)$$, 'tras 10 s, paso de ~55 m (20 km/h) aceptado');
reset role;
select is((select extensions.st_x(location::extensions.geometry) from public.driver_locations where driver_id = pg_temp.id('d1')), -63.1805::float8, 'el rechazo no movió el ancla y el paso válido sí');
update public.driver_locations set updated_at = now() - interval '10 minutes' where driver_id = pg_temp.id('d1');
select pg_temp.login(pg_temp.id('d1'));
select throws_ok($$select public.upsert_driver_location(-62.5, -17.78)$$, 'P0001', 'implausible_location', 'teletransporte tras una pausa larga (10 min, ~430 km/h) rechazado');
reset role;
-- Broadcast de posición al pasajero durante assigned (2 posiciones aceptadas hasta aquí).
select pg_temp.login(pg_temp.id('a1'));
select ok(pg_temp.can_join('trip:' || pg_temp.id('c1')), 'pasajero se une a su trip:');
select is((select count(*)::int from realtime.messages where topic = 'trip:' || pg_temp.id('c1') and event = 'pos'), 2, 'pasajero recibe pos en assigned: solo posiciones aceptadas');
reset role;
select is((select count(*)::int from public.ride_track_points where ride_id = pg_temp.id('c1')), 0, 'assigned: no se guarda historial');
-- Tracking en in_progress: historial con límite de 1 por 5 s.
update public.rides set status = 'in_progress', started_at = now() where id = pg_temp.id('c1');
update public.driver_locations set updated_at = now() - interval '10 seconds' where driver_id = pg_temp.id('d1');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok($$select public.upsert_driver_location(-63.181, -17.78)$$, 'in_progress: reporta');
select lives_ok($$select public.upsert_driver_location(-63.1815, -17.78)$$, 'segundo reporte inmediato (ignorado)');
reset role;
select is((select count(*)::int from public.ride_track_points where ride_id = pg_temp.id('c1')), 1, 'límite: un solo punto antes de 5 s');
update public.driver_locations set updated_at = now() - interval '10 seconds' where driver_id = pg_temp.id('d1');
update public.ride_track_points set recorded_at = recorded_at - interval '10 seconds' where ride_id = pg_temp.id('c1');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok($$select public.upsert_driver_location(-63.182, -17.78)$$, 'reporte pasados 5 s');
reset role;
select is((select count(*)::int from public.ride_track_points where ride_id = pg_temp.id('c1')), 2, 'pasados 5 s se agrega otro punto');

-- Offline sin viaje con una posición inválida/lejana: solo cambia is_online, no falla ni mueve el ancla.
select pg_temp.login(pg_temp.id('d2'));
select lives_ok($$select public.upsert_driver_location(-63.18, -17.78)$$, 'd2 sin viaje reporta');
reset role;
update public.driver_locations set updated_at = now() - interval '10 seconds' where driver_id = pg_temp.id('d2');
select pg_temp.login(pg_temp.id('d2'));
select lives_ok($$select public.upsert_driver_location(-62.5, -17.78, null, null, false)$$, 'pasar a offline con un fix malo funciona');
reset role;
select is((select is_online from public.driver_locations where driver_id = pg_temp.id('d2')), false, 'queda offline');
select is((select extensions.st_x(location::extensions.geometry) from public.driver_locations where driver_id = pg_temp.id('d2')), -63.18::float8, 'offline no movió la posición');

-- Cerrado el viaje, se pierde el acceso al trip:.
update public.rides set status = 'completed', completed_at = now(), final_fare_cents = 1000 where id = pg_temp.id('c1');
select pg_temp.login(pg_temp.id('d1'));
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c1')), 'conductor no se une a trip: cerrado');
select pg_temp.login(pg_temp.id('a1'));
select ok(not pg_temp.can_join('trip:' || pg_temp.id('c1')), 'pasajero no se une a trip: cerrado');
reset role;

select * from finish();
rollback;
