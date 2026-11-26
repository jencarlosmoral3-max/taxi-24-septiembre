begin;
select plan(96);

-- Usuarios: pasajeros A, B, C, E, X (X sin perfil); conductores D1..D7 (+ D8 pendiente).
-- D1, D2 cerca; D3 lejos; D4 suspendido; D5 offline; D6 ubicación vieja; D7 ocupado (viaje activo).
create function pg_temp.id(p text) returns uuid language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p)::uuid $$;
-- Teléfonos sin '+' (como los guarda auth). El trigger de B-03 (si ya está mergeado) crea los perfiles: el upsert vale para ambos casos.
insert into auth.users (id, instance_id, aud, role, phone)
select pg_temp.id(p), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '591700' || lpad(n::text, 5, '0')
from unnest(array['a1','b1','c1','e1','91','92','93','f1','d1','d2','d3','d4','d5','d6','d7','d8']) with ordinality as t(p, n);
insert into public.profiles (id, full_name)
select pg_temp.id(p), 'U ' || p from unnest(array['a1','b1','c1','e1','91','92','93','d1','d2','d3','d4','d5','d6','d7','d8']) p -- f1 sin perfil
on conflict (id) do update set full_name = excluded.full_name;
delete from public.profiles where id = pg_temp.id('f1'); -- por si un trigger de alta lo creó
insert into public.drivers (profile_id, status) values
  (pg_temp.id('d1'), 'approved'), (pg_temp.id('d2'), 'approved'), (pg_temp.id('d3'), 'approved'),
  (pg_temp.id('d4'), 'suspended'), (pg_temp.id('d5'), 'approved'), (pg_temp.id('d6'), 'approved'),
  (pg_temp.id('d7'), 'approved'), (pg_temp.id('d8'), 'pending');
insert into public.vehicles (driver_id, plate) values
  (pg_temp.id('d1'), '1111AAA'), (pg_temp.id('d2'), '2222BBB'), (pg_temp.id('d7'), '7777GGG');
-- Centro -63.18,-17.78; ~1 km = 0.0095 grados de longitud a esta latitud. Radio de config: 3000 m.
insert into public.driver_locations (driver_id, location, is_online, updated_at) values
  (pg_temp.id('d1'), 'SRID=4326;POINT(-63.180 -17.780)', true, now()),
  (pg_temp.id('d2'), 'SRID=4326;POINT(-63.190 -17.785)', true, now()),
  (pg_temp.id('d3'), 'SRID=4326;POINT(-63.300 -17.780)', true, now()),
  (pg_temp.id('d4'), 'SRID=4326;POINT(-63.181 -17.781)', true, now()),
  (pg_temp.id('d5'), 'SRID=4326;POINT(-63.182 -17.781)', false, now()),
  (pg_temp.id('d6'), 'SRID=4326;POINT(-63.183 -17.781)', true, now() - interval '5 minutes'),
  (pg_temp.id('d7'), 'SRID=4326;POINT(-63.184 -17.781)', true, now());
-- D7 ocupado: viaje de E asignado por el camino legal.
insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, expires_at)
values (pg_temp.id('e0'), pg_temp.id('e1'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min');
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at)
values (pg_temp.id('e9'), pg_temp.id('e0'), pg_temp.id('d7'), 1000, now() + interval '45 s');
update public.ride_offers set status = 'accepted' where id = pg_temp.id('e9');
update public.rides set status = 'assigned', driver_id = pg_temp.id('d7'), accepted_offer_id = pg_temp.id('e9'),
  vehicle_id = (select id from public.vehicles where driver_id = pg_temp.id('d7')) where id = pg_temp.id('e0');

create function pg_temp.login(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
-- Guarda/lee ids entre sentencias (GUC de transacción).
create function pg_temp.put(k text, v uuid) returns uuid language sql as $$ select set_config('t.' || k, v::text, true)::uuid $$;
create function pg_temp.g(k text) returns uuid language sql as $$ select current_setting('t.' || k)::uuid $$;
grant execute on function pg_temp.id(text), pg_temp.login(uuid), pg_temp.put(text, uuid), pg_temp.g(text) to public;

-- Privilegios
select ok(has_function_privilege('authenticated', 'public.create_ride(double precision,double precision,double precision,double precision,text,text,integer,smallint,text)', 'execute'), 'authenticated ejecuta create_ride');
select ok(not has_function_privilege('anon', 'public.accept_offer(uuid)', 'execute'), 'anon no ejecuta accept_offer');
select ok(not has_function_privilege('authenticated', 'public.expire_stale()', 'execute'), 'authenticated no ejecuta expire_stale');
select ok(not has_function_privilege('authenticated', 'private.nearby_driver_ids(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'private.notify(text,text,jsonb)', 'execute'), 'authenticated no ejecuta helpers private de la puja');

-- B-05 create_ride
select pg_temp.login(pg_temp.id('a1'));
select throws_ok($$select public.create_ride(-63.18, -17.78, -63.19, -17.79, 'o', 'd', 999)$$, 'P0001', 'fare_below_minimum', 'tarifa bajo el mínimo rechazada');
select throws_ok($$select public.create_ride(-63.18, 95, -63.19, -17.79, 'o', 'd', 1000)$$, 'P0001', 'invalid_coordinates', 'latitud fuera de rango rechazada');
select throws_ok($$select public.create_ride(-63.18, -17.78, -63.19, -17.79, 'o', 'd', 1000, 9::smallint)$$, 'P0001', 'invalid_passenger_count', 'pasajeros fuera de rango rechazado');
select pg_temp.login(pg_temp.id('f1'));
select throws_ok($$select public.create_ride(-63.18, -17.78, -63.19, -17.79, 'o', 'd', 1000)$$, '42501', 'not_allowed', 'sin perfil no puede pedir');
reset role;
select pg_temp.login(pg_temp.id('a1'));
select lives_ok($$select pg_temp.put('ra', public.create_ride(-63.18, -17.78, -63.19, -17.79, 'Plaza', 'Terminal', 1200))$$, 'create_ride devuelve el id');
select throws_ok($$select public.create_ride(-63.18, -17.78, -63.19, -17.79, 'o', 'd', 1200)$$, 'P0001', 'passenger_has_open_ride', 'segundo pedido abierto rechazado');
reset role;
select is((select array_agg(driver_id order by driver_id) from private.nearby_driver_ids(pg_temp.g('ra'))),
  array[pg_temp.id('d1'), pg_temp.id('d2')], 'candidatos: solo D1 y D2 (excluye lejos, suspendido, offline, ubicación vieja, ocupado)');
select is((select count(*)::int from realtime.messages where event = 'ride_requested' and payload->>'ride_id' = pg_temp.g('ra')::text and topic = 'driver:' || pg_temp.id('d1')), 1, 'D1 recibió ride_requested por Broadcast');
select is((select count(*)::int from realtime.messages where event = 'ride_requested' and payload->>'ride_id' = pg_temp.g('ra')::text and topic in ('driver:' || pg_temp.id('d3'), 'driver:' || pg_temp.id('d7'), 'driver:' || pg_temp.id('d4'))), 0, 'D3, D4 (suspendido) y D7 no recibieron nada');

-- get_nearby_requests
select pg_temp.login(pg_temp.id('d1'));
select is((select count(*)::int from public.get_nearby_requests() j where (j->>'ride_id')::uuid = pg_temp.g('ra')), 1, 'D1 ve el pedido cercano');
select pg_temp.login(pg_temp.id('d3'));
select is((select count(*)::int from public.get_nearby_requests()), 0, 'D3 (lejos) no ve pedidos');
select pg_temp.login(pg_temp.id('b1'));
select throws_ok($$select public.get_nearby_requests()$$, '42501', 'not_allowed', 'un no-conductor no consulta pedidos cercanos');
reset role;

-- B-06 make_offer
select pg_temp.login(pg_temp.id('b1'));
select throws_ok(format($$select public.make_offer(%L, 1200)$$, pg_temp.g('ra')), '42501', 'not_allowed', 'un pasajero no puede ofertar');
select pg_temp.login(pg_temp.id('d5'));
select throws_ok(format($$select public.make_offer(%L, 1200)$$, pg_temp.g('ra')), 'P0001', 'driver_offline', 'conductor offline no oferta');
select pg_temp.login(pg_temp.id('d7'));
select throws_ok(format($$select public.make_offer(%L, 1200)$$, pg_temp.g('ra')), 'P0001', 'driver_busy', 'conductor ocupado no oferta');
select pg_temp.login(pg_temp.id('d8'));
select throws_ok(format($$select public.make_offer(%L, 1200)$$, pg_temp.g('ra')), '42501', 'not_allowed', 'conductor no aprobado no oferta');
select pg_temp.login(pg_temp.id('d1'));
select throws_ok(format($$select public.make_offer(%L, 500)$$, pg_temp.g('ra')), 'P0001', 'fare_below_minimum', 'oferta bajo el mínimo rechazada');
select lives_ok(format($$select pg_temp.put('o1', public.make_offer(%L, 1200))$$, pg_temp.g('ra')), 'D1 oferta');
select lives_ok(format($$select pg_temp.put('o1b', public.make_offer(%L, 1300))$$, pg_temp.g('ra')), 'D1 contraoferta');
reset role;
select is((select array_agg(status::text order by price_cents) from public.ride_offers where ride_id = pg_temp.g('ra') and driver_id = pg_temp.id('d1')),
  array['withdrawn', 'active'], 'la segunda oferta reemplaza a la primera (historial conservado)');
select is((select count(*)::int from public.ride_offers where ride_id = pg_temp.g('ra') and status = 'active'), 1, 'una sola oferta activa por conductor y pedido');
select is((select count(*)::int from realtime.messages where event = 'offer_made' and payload->>'ride_id' = pg_temp.g('ra')::text and topic = 'rider:' || pg_temp.id('a1')), 2, 'el pasajero fue notificado de cada oferta');
select pg_temp.login(pg_temp.id('d2'));
select lives_ok(format($$select pg_temp.put('o2', public.make_offer(%L, 1250))$$, pg_temp.g('ra')), 'D2 oferta');
reset role;

-- Pedido de C con oferta de D1 (para probar la expiración de ofertas ajenas al asignar) y oferta vencida de D2.
select pg_temp.login(pg_temp.id('c1'));
select lives_ok($$select pg_temp.put('rc', public.create_ride(-63.18, -17.78, -63.19, -17.79, 'Casa', 'Mercado', 1100))$$, 'C crea su pedido');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok(format($$select pg_temp.put('o1c', public.make_offer(%L, 1100))$$, pg_temp.g('rc')), 'D1 oferta también a C');
reset role;
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at)
values (pg_temp.id('c2'), pg_temp.g('rc'), pg_temp.id('d2'), 1100, now() - interval '1 second');

-- B-07 accept_offer
select pg_temp.login(pg_temp.id('b1'));
select throws_ok(format($$select public.accept_offer(%L)$$, pg_temp.g('o1b')), '42501', 'not_allowed', 'otro pasajero no puede aceptar ofertas ajenas');
select pg_temp.login(pg_temp.id('a1'));
select throws_ok(format($$select public.accept_offer(%L)$$, pg_temp.g('o1')), 'P0001', 'offer_not_active', 'oferta retirada no se acepta');
select lives_ok(format($$select pg_temp.put('acc', public.accept_offer(%L))$$, pg_temp.g('o1b')), 'A acepta la oferta de D1');
select is(pg_temp.g('acc'), pg_temp.g('ra'), 'accept_offer devuelve el id del ride');
select is(public.accept_offer(pg_temp.g('o1b')), pg_temp.g('ra'), 'aceptar de nuevo es idempotente');
reset role;
select results_eq(format($$select status::text, driver_id, accepted_offer_id, vehicle_id, assigned_at is not null from public.rides where id = %L$$, pg_temp.g('ra')),
  format($$values ('assigned', %L::uuid, %L::uuid, (select id from public.vehicles where driver_id = %L), true)$$, pg_temp.id('d1'), pg_temp.g('o1b'), pg_temp.id('d1')),
  'ride asignado con conductor, oferta y vehículo');
select is((select status::text from public.ride_offers where id = pg_temp.g('o2')), 'rejected', 'las demás ofertas del pedido quedan rechazadas');
select is((select status::text from public.ride_offers where id = pg_temp.g('o1c')), 'expired', 'las ofertas del conductor en otros pedidos expiran');
select is((select count(*)::int from realtime.messages where event in ('offer_accepted', 'offer_rejected', 'ride_assigned') and payload->>'ride_id' = pg_temp.g('ra')::text), 3, 'notificados conductor aceptado, rechazado y pasajero');
select pg_temp.login(pg_temp.id('a1'));
select is(public.accept_offer(pg_temp.g('o1b')), pg_temp.g('ra'), 'idempotente tras el commit también');
select throws_ok(format($$select public.accept_offer(%L)$$, pg_temp.g('o2')), 'P0001', 'ride_not_open', 'aceptar otra oferta sobre un ride ya asignado rechazado');
select pg_temp.login(pg_temp.id('c1'));
select throws_ok(format($$select public.accept_offer(%L)$$, pg_temp.g('o1c')), 'P0001', 'offer_expired', 'oferta expirada (por estado) rechazada');
select throws_ok(format($$select public.accept_offer(%L)$$, pg_temp.id('c2')), 'P0001', 'offer_expired', 'oferta vencida por tiempo rechazada sin esperar al cron');
reset role;

-- B-08 transiciones
select pg_temp.login(pg_temp.id('d2'));
select throws_ok(format($$select public.driver_arrived(%L)$$, pg_temp.g('ra')), '42501', 'not_allowed', 'driver_arrived por otro conductor rechazado');
select pg_temp.login(pg_temp.id('a1'));
select throws_ok(format($$select public.driver_arrived(%L)$$, pg_temp.g('ra')), '42501', 'not_allowed', 'el pasajero no marca llegada');
select pg_temp.login(pg_temp.id('d1'));
select throws_ok(format($$select public.complete_ride(%L)$$, pg_temp.g('ra')), 'P0001', 'invalid_transition', 'complete antes de start rechazado');
select throws_ok(format($$select public.start_ride(%L)$$, pg_temp.g('ra')), 'P0001', 'invalid_transition', 'start antes de driver_arrived rechazado');
select lives_ok(format($$select public.driver_arrived(%L)$$, pg_temp.g('ra')), 'D1 llegó');
select lives_ok(format($$select public.start_ride(%L)$$, pg_temp.g('ra')), 'D1 inicia');
select pg_temp.login(pg_temp.id('a1'));
select throws_ok(format($$select public.cancel_ride(%L, 'x')$$, pg_temp.g('ra')), 'P0001', 'invalid_transition', 'no se cancela un viaje en curso');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok(format($$select public.complete_ride(%L)$$, pg_temp.g('ra')), 'D1 completa');
select throws_ok(format($$select public.complete_ride(%L)$$, pg_temp.g('ra')), 'P0001', 'invalid_transition', 'completar dos veces rechazado');
reset role;
select results_eq(format($$select status::text, final_fare_cents, completed_at is not null, driver_arrived_at is not null, started_at is not null from public.rides where id = %L$$, pg_temp.g('ra')),
  $$values ('completed', 1300, true, true, true)$$, 'camino feliz: completed con tarifa final = precio de la oferta aceptada');
select is((select count(*)::int from realtime.messages where topic = 'trip:' || pg_temp.g('ra')), 3, 'trip:<id> recibió llegada, inicio y fin');

-- Cancelaciones
select pg_temp.login(pg_temp.id('c1'));
select lives_ok(format($$select public.cancel_ride(%L, 'me arrepentí')$$, pg_temp.g('rc')), 'pasajero cancela antes de la asignación');
select pg_temp.login(pg_temp.id('d2'));
select throws_ok(format($$select public.make_offer(%L, 1200)$$, pg_temp.g('rc')), 'P0001', 'ride_not_open', 'oferta sobre pedido no requested rechazada');
select pg_temp.login(pg_temp.id('c1'));
select throws_ok(format($$select public.cancel_ride(%L)$$, pg_temp.g('rc')), 'P0001', 'invalid_transition', 'cancelar dos veces rechazado');
select pg_temp.login(pg_temp.id('b1'));
select throws_ok(format($$select public.cancel_ride(%L)$$, pg_temp.g('rc')), '42501', 'not_allowed', 'un tercero no cancela');
reset role;
select results_eq(format($$select status::text, cancel_reason, cancelled_at is not null from public.rides where id = %L$$, pg_temp.g('rc')),
  $$values ('cancelled_passenger', 'me arrepentí', true)$$, 'pedido cancelado por el pasajero');

-- Segundo viaje de A: D1 cancela tras la asignación.
select pg_temp.login(pg_temp.id('a1'));
select lives_ok($$select pg_temp.put('ra2', public.create_ride(-63.18, -17.78, -63.19, -17.79, 'Plaza', 'Terminal', 1200))$$, 'A pide otro viaje (el anterior terminó)');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok(format($$select pg_temp.put('o3', public.make_offer(%L, 1200))$$, pg_temp.g('ra2')), 'D1 oferta (libre otra vez)');
select pg_temp.login(pg_temp.id('a1'));
select lives_ok(format($$select public.accept_offer(%L)$$, pg_temp.g('o3')), 'A acepta');
select pg_temp.login(pg_temp.id('d2'));
select throws_ok(format($$select public.cancel_ride(%L)$$, pg_temp.g('ra2')), '42501', 'not_allowed', 'conductor no asignado no cancela');
select throws_ok(format($$select public.start_ride(%L)$$, pg_temp.g('ra2')), '42501', 'not_allowed', 'start_ride por otro conductor rechazado');
select throws_ok(format($$select public.complete_ride(%L)$$, pg_temp.g('ra2')), '42501', 'not_allowed', 'complete_ride por otro conductor rechazado');
select pg_temp.login(pg_temp.id('a1'));
select throws_ok(format($$select public.start_ride(%L)$$, pg_temp.g('ra2')), '42501', 'not_allowed', 'start_ride por el pasajero rechazado');
select throws_ok(format($$select public.complete_ride(%L)$$, pg_temp.g('ra2')), '42501', 'not_allowed', 'complete_ride por el pasajero rechazado');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok(format($$select public.cancel_ride(%L, 'avería')$$, pg_temp.g('ra2')), 'el conductor cancela antes de iniciar');
select pg_temp.login(pg_temp.id('a1'));
select throws_ok(format($$select public.accept_offer(%L)$$, pg_temp.g('o3')), 'P0001', 'ride_not_open', 'reintentar accept sobre un viaje cancelado no es idempotente');
select throws_ok($$select public.create_ride(-63.18, -17.78, -63.19, -17.79, repeat('x', 201), 'd', 1000)$$, 'P0001', 'invalid_input', 'texto demasiado largo rechazado');
reset role;
reset role;
select is((select status::text from public.rides where id = pg_temp.g('ra2')), 'cancelled_driver', 'estado cancelled_driver');

-- Pedido vencido por tiempo pero aún 'requested' (el cron no corrió): las RPC no dependen del cron.
select pg_temp.login(pg_temp.id('92'));
select lives_ok($$select pg_temp.put('r92', public.create_ride(-63.18, -17.78, -63.19, -17.79, 'Plaza', 'Terminal', 1000))$$, 'pasajero 92 crea pedido');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok(format($$select pg_temp.put('o92', public.make_offer(%L, 1000))$$, pg_temp.g('r92')), 'D1 oferta al pedido de 92');
reset role;
update public.rides set created_at = now() - interval '10 minutes', expires_at = now() - interval '1 second' where id = pg_temp.g('r92');
select pg_temp.login(pg_temp.id('d2'));
select throws_ok(format($$select public.make_offer(%L, 1000)$$, pg_temp.g('r92')), 'P0001', 'ride_not_open', 'make_offer sobre pedido vencido rechazado');
select pg_temp.login(pg_temp.id('92'));
select throws_ok(format($$select public.accept_offer(%L)$$, pg_temp.g('o92')), 'P0001', 'ride_not_open', 'accept_offer sobre pedido vencido rechazado');
select lives_ok($$select public.create_ride(-63.18, -17.78, -63.19, -17.79, 'Plaza', 'Terminal', 1000)$$, 'create_ride expira el pedido vencido propio y crea el nuevo');
reset role;
select is((select status::text from public.rides where id = pg_temp.g('r92')), 'expired', 'el pedido vencido quedó expired sin cron');
select is((select status::text from public.ride_offers where id = pg_temp.g('o92')), 'expired', 'y su oferta también');

-- Tarifa/ofertas excesivas, vehículo, oferta sobre pedido propio, conductor suspendido.
select pg_temp.login(pg_temp.id('b1'));
select lives_ok($$select pg_temp.put('rb', public.create_ride(-63.18, -17.78, -63.19, -17.79, 'Plaza', 'Terminal', 1000))$$, 'B crea un pedido vigente');
select pg_temp.login(pg_temp.id('d1'));
select throws_ok(format($$select public.make_offer(%L, 5001)$$, pg_temp.g('rb')), 'P0001', 'fare_too_high', 'oferta > 5x la tarifa pedida rechazada');
select pg_temp.login(pg_temp.id('d3'));
select throws_ok(format($$select public.make_offer(%L, 1000)$$, pg_temp.g('rb')), 'P0001', 'driver_has_no_vehicle', 'conductor sin vehículo no oferta');
select pg_temp.login(pg_temp.id('d2'));
select lives_ok(format($$select count(public.make_offer(%L, 1000 + g)) from generate_series(1, 5) g$$, pg_temp.g('rb')), 'D2 hace 5 ofertas al mismo pedido');
select throws_ok(format($$select public.make_offer(%L, 1000)$$, pg_temp.g('rb')), 'P0001', 'too_many_offers', 'la 6ta oferta del mismo conductor al mismo pedido rechazada');
select lives_ok($$select pg_temp.put('rd2', public.create_ride(-63.19, -17.78, -63.19, -17.79, 'Casa', 'Mercado', 1000))$$, 'D2 también puede pedir como pasajero');
select throws_ok(format($$select public.make_offer(%L, 1000)$$, pg_temp.g('rd2')), '42501', 'not_allowed', 'no se oferta sobre el pedido propio');
select lives_ok(format($$select public.cancel_ride(%L)$$, pg_temp.g('rd2')), 'D2 cancela su pedido');
reset role;
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at)
values (pg_temp.id('b4'), pg_temp.g('rb'), pg_temp.id('d4'), 1000, now() + interval '45 s');
select pg_temp.login(pg_temp.id('b1'));
select throws_ok(format($$select public.accept_offer(%L)$$, pg_temp.id('b4')), 'P0001', 'driver_unavailable', 'oferta de un conductor suspendido no se acepta');
reset role;

-- Rate limit: 5 pedidos en 10 min.
insert into public.rides (passenger_id, origin, destination, offered_fare_cents, status, expires_at)
select pg_temp.id('93'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, 'expired', now() + interval '5 minutes'
from generate_series(1, 5);
select pg_temp.login(pg_temp.id('93'));
select throws_ok($$select public.create_ride(-63.18, -17.78, -63.19, -17.79, 'o', 'd', 1000)$$, 'P0001', 'rate_limited', 'más de 5 pedidos en 10 minutos rechazado');
reset role;

-- B-09 expire_stale
insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, created_at, expires_at)
values (pg_temp.id('e2'), pg_temp.id('91'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000,
  now() - interval '10 minutes', now() - interval '5 minutes');
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at)
values (pg_temp.id('b2'), pg_temp.g('rb'), pg_temp.id('d1'), 1000, now() - interval '1 second');
select pg_temp.login(pg_temp.id('d1'));
select throws_ok($$select public.expire_stale()$$, '42501', null, 'authenticated no puede ejecutar expire_stale');
reset role;
select ok((public.expire_stale()->>'rides_expired')::int >= 1, 'expire_stale reporta pedidos expirados');
select is((select status::text from public.rides where id = pg_temp.id('e2')), 'expired', 'el pedido viejo pasa a expired');
select is((select status::text from public.rides where id = pg_temp.g('rb')), 'requested', 'el pedido vigente no se toca');
select is((select count(*)::int from realtime.messages where event = 'ride_expired' and payload->>'ride_id' = pg_temp.id('e2')::text and topic = 'rider:' || pg_temp.id('91')), 1, 'el pasajero fue notificado de la expiración');
select is((select status::text from public.ride_offers where id = pg_temp.id('b2')), 'expired', 'la oferta vencida pasa a expired');
select ok(not (select is_online from public.driver_locations where driver_id = pg_temp.id('d6')), 'D6 (ubicación vieja) queda offline');
select ok((select is_online from public.driver_locations where driver_id = pg_temp.id('d1')), 'D1 (ubicación fresca) sigue online');
select is((select count(*)::int from cron.job where jobname = 'vyro-expire-stale'), 1, 'job de pg_cron programado');

select * from finish();
rollback;
