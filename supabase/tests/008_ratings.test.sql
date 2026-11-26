begin;
select plan(22);

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
  return exists (select 1 from realtime.messages m where m.extension = 'broadcast');
end $$;
create function pg_temp.can_send(t text) returns boolean language plpgsql as $$
begin
  perform set_config('realtime.topic', t, true);
  insert into realtime.messages (topic, extension, payload, event, private) values (t, 'broadcast', '{}', 'pos', true);
  return true;
exception when insufficient_privilege then return false;
end $$;
grant execute on function pg_temp.id(text), pg_temp.login(uuid, text), pg_temp.can_join(text), pg_temp.can_send(text) to public;

-- R1 completado hace 1 hora; R2 (b1, requested) no completado; R4 completado hace 8 días.
update public.rides set status = 'in_progress', started_at = now() where id = pg_temp.id('c1');
update public.rides set status = 'completed', completed_at = now() - interval '1 hour', final_fare_cents = 1000 where id = pg_temp.id('c1');
update public.rides set status = 'cancelled_passenger', cancelled_at = now() where id = pg_temp.id('c2');
insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, expires_at)
values (pg_temp.id('c4'), pg_temp.id('b1'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min');
-- r2 sigue requested: b1 no puede tener dos abiertos; cancelo r2 para dejar a b1 solo con r4.
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at) values (pg_temp.id('f4'), pg_temp.id('c4'), pg_temp.id('d2'), 1000, now() + interval '45 s');
update public.ride_offers set status = 'accepted' where id = pg_temp.id('f4');
update public.rides set status = 'assigned', driver_id = pg_temp.id('d2'), accepted_offer_id = pg_temp.id('f4') where id = pg_temp.id('c4');
update public.rides set status = 'in_progress', started_at = now() where id = pg_temp.id('c4');
update public.rides set status = 'completed', completed_at = now() - interval '8 days', final_fare_cents = 1000 where id = pg_temp.id('c4');

select ok(has_function_privilege('authenticated', 'public.rate_ride(uuid,smallint,text)', 'execute')
  and not has_function_privilege('anon', 'public.rate_ride(uuid,smallint,text)', 'execute'), 'privilegios de rate_ride');

select pg_temp.login(pg_temp.id('a1'));
select throws_ok(format($$select public.rate_ride(%L, 6::smallint)$$, pg_temp.id('c1')), 'P0001', 'invalid_input', 'estrellas fuera de rango');
select throws_ok(format($$select public.rate_ride(%L, 5::smallint, %L)$$, pg_temp.id('c1'), repeat('x', 281)), 'P0001', 'invalid_input', 'comentario > 280');
select throws_ok(format($$select public.rate_ride(%L, 5::smallint)$$, pg_temp.id('c2')), '42501', 'not_allowed', 'calificar viaje ajeno rechazado');
select lives_ok(format($$select public.rate_ride(%L, 4::smallint, 'bien')$$, pg_temp.id('c1')), 'pasajero califica al conductor');
select throws_ok(format($$select public.rate_ride(%L, 5::smallint)$$, pg_temp.id('c1')), 'P0001', 'already_rated', 'doble calificación rechazada');
select is((select ratee_id from public.ratings where ride_id = pg_temp.id('c1') and rater_id = pg_temp.id('a1')), pg_temp.id('d1'), 'califica a la contraparte');
select pg_temp.login(pg_temp.id('b1'));
select throws_ok(format($$select public.rate_ride(%L, 5::smallint)$$, pg_temp.id('c1')), '42501', 'not_allowed', 'tercero no califica');
select throws_ok(format($$select public.rate_ride(%L, 5::smallint)$$, pg_temp.id('c4')), 'P0001', 'rating_window_closed', 'fuera de la ventana de 7 días');
select throws_ok(format($$select public.rate_ride(%L, 5::smallint)$$, gen_random_uuid()), 'P0001', 'ride_not_found', 'viaje inexistente');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok(format($$select public.rate_ride(%L, 2::smallint)$$, pg_temp.id('c1')), 'conductor califica al pasajero');
select throws_ok(format($$select public.rate_ride(%L, 5::smallint)$$, pg_temp.id('c1')), 'P0001', 'already_rated', 'doble calificación del conductor rechazada');
reset role;
select pg_temp.login(pg_temp.id('d1'));
select is((select count(*)::int from public.ratings where rater_id = pg_temp.id('a1')), 0, 'el calificado no ve la fila (ni el comentario) de su calificación');
select is((select count(*)::int from public.ratings where rater_id = pg_temp.id('d1')), 1, 'el calificador ve la suya');
select pg_temp.login(pg_temp.id('ad'), 'admin');
select is((select count(*)::int from public.ratings), 2, 'admin ve todas');
reset role;
select is((select rating_avg from public.profiles where id = pg_temp.id('d1')), 4.00::numeric, 'promedio del conductor');
select is((select rating_count from public.profiles where id = pg_temp.id('d1')), 1, 'conteo del conductor');
select is((select rating_avg from public.profiles where id = pg_temp.id('a1')), 2.00::numeric, 'promedio del pasajero');

-- Segundo viaje de a1 con d1 para verificar el promedio acumulado; y viaje no completado.
insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, expires_at)
values (pg_temp.id('c5'), pg_temp.id('a1'), 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min');
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at) values (pg_temp.id('f5'), pg_temp.id('c5'), pg_temp.id('d1'), 1000, now() + interval '45 s');
update public.ride_offers set status = 'accepted' where id = pg_temp.id('f5');
update public.rides set status = 'assigned', driver_id = pg_temp.id('d1'), accepted_offer_id = pg_temp.id('f5'),
  vehicle_id = (select id from public.vehicles where driver_id = pg_temp.id('d1')) where id = pg_temp.id('c5');
select pg_temp.login(pg_temp.id('a1'));
select throws_ok(format($$select public.rate_ride(%L, 5::smallint)$$, pg_temp.id('c5')), 'P0001', 'ride_not_completed', 'viaje no completado rechazado');
reset role;
update public.rides set status = 'in_progress', started_at = now() where id = pg_temp.id('c5');
update public.rides set status = 'completed', completed_at = now(), final_fare_cents = 1000 where id = pg_temp.id('c5');
select pg_temp.login(pg_temp.id('a1'));
select lives_ok(format($$select public.rate_ride(%L, 5::smallint)$$, pg_temp.id('c5')), 'segunda calificación al mismo conductor en otro viaje');
reset role;
select is((select rating_avg from public.profiles where id = pg_temp.id('d1')), 4.50::numeric, 'promedio acumulado 4,50');
select is((select rating_count from public.profiles where id = pg_temp.id('d1')), 2, 'conteo acumulado 2');

select * from finish();
rollback;
