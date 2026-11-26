begin;
select plan(18);

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

create function pg_temp.put(k text, v uuid) returns uuid language sql as $$ select set_config('t.' || k, v::text, true)::uuid $$;
create function pg_temp.g(k text) returns uuid language sql as $$ select current_setting('t.' || k)::uuid $$;
grant execute on function pg_temp.put(text, uuid), pg_temp.g(text) to public;

select ok(has_function_privilege('authenticated', 'public.trigger_sos(double precision,double precision,uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.trigger_sos(double precision,double precision,uuid,uuid)', 'execute'), 'privilegios de trigger_sos');

select pg_temp.login(pg_temp.id('a1'));
select lives_ok($$select pg_temp.put('s1', public.trigger_sos(-63.18, -17.78, '11111111-1111-1111-1111-111111111111', pg_temp.id('c1')))$$, 'SOS con viaje propio');
select is(public.trigger_sos(-63.18, -17.78, '11111111-1111-1111-1111-111111111111', pg_temp.id('c1')), pg_temp.g('s1'), 'reintento con el mismo client_event_id devuelve el mismo id');
reset role;
select is((select count(*)::int from public.sos_events where user_id = pg_temp.id('a1')), 1, 'sin duplicados');
select is((select count(*)::int from realtime.messages where topic = 'admin:sos' and event = 'sos' and payload->>'event_id' = pg_temp.g('s1')::text
  and payload->>'user_id' = pg_temp.id('a1')::text and payload->>'ride_id' = pg_temp.id('c1')::text and (payload->>'lat')::float8 = -17.78), 1, 'admin:sos recibió el evento una sola vez (el reintento no re-notifica)');
select is((select extensions.st_x(location::extensions.geometry) from public.sos_events where id = pg_temp.g('s1')), -63.18::float8, 'ubicación guardada');

select pg_temp.login(pg_temp.id('b1'));
select throws_ok(format($$select public.trigger_sos(-63.18, -17.78, gen_random_uuid(), %L)$$, pg_temp.id('c1')), '42501', 'not_allowed', 'SOS sobre viaje ajeno rechazado');
select lives_ok($$select public.trigger_sos(-63.18, -17.78, gen_random_uuid())$$, 'SOS sin viaje permitido');
select throws_ok($$select public.trigger_sos(-63.18, 95, gen_random_uuid())$$, 'P0001', 'invalid_input', 'coordenadas inválidas');
select pg_temp.login(pg_temp.id('d1'));
select lives_ok(format($$select public.trigger_sos(-63.18, -17.78, gen_random_uuid(), %L)$$, pg_temp.id('c1')), 'el conductor asignado también puede');
-- Rate limit: b1 ya hizo 1; 4 más permitidos, el 6.º se rechaza; un reintento viejo sigue devolviendo su id.
select pg_temp.login(pg_temp.id('b1'));
select lives_ok($$select public.trigger_sos(-63.18, -17.78, ('22222222-2222-2222-2222-22222222222' || g)::uuid) from generate_series(1, 4) g$$, '4 SOS más (5 en total)');
select throws_ok($$select public.trigger_sos(-63.18, -17.78, gen_random_uuid())$$, 'P0001', 'rate_limited', 'el 6.º en 10 min se rechaza');
select lives_ok($$select public.trigger_sos(-63.18, -17.78, '22222222-2222-2222-2222-222222222221')$$, 'un reintento con el 5.º evento ya al límite se acepta');
select is((select count(*)::int from public.sos_events), 5, 'el reintento no creó otro evento ni contó para el límite');
select pg_temp.login(pg_temp.id('e9'));
select throws_ok($$select public.trigger_sos(-63.18, -17.78, gen_random_uuid())$$, '42501', 'not_allowed', 'sin perfil rechazado');

-- Políticas de admin:sos
reset role;
select pg_temp.login(pg_temp.id('ad'), 'admin');
select ok(pg_temp.can_join('admin:sos'), 'admin se une a admin:sos');
select pg_temp.login(pg_temp.id('a1'));
select ok(not pg_temp.can_join('admin:sos'), 'usuario normal no se une a admin:sos');
select pg_temp.login(pg_temp.id('d1'));
select ok(not pg_temp.can_join('admin:sos'), 'conductor no se une a admin:sos');
reset role;

select * from finish();
rollback;
