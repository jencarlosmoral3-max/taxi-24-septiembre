begin;
select plan(65);

-- Usuarios: A, B pasajeros; D1, D2 conductores aprobados; D3 conductor pendiente; M admin; X sin rol.
insert into auth.users (id, instance_id, aud, role, phone) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000001'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000002'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000011'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000012'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000013'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000014'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000099'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000098');
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Pasajero A'),
  ('00000000-0000-0000-0000-0000000000b1', 'Pasajero B'),
  ('00000000-0000-0000-0000-0000000000d1', 'Conductor D1'),
  ('00000000-0000-0000-0000-0000000000d2', 'Conductor D2'),
  ('00000000-0000-0000-0000-0000000000d3', 'Conductor D3'),
  ('00000000-0000-0000-0000-0000000000d4', 'Conductor D4'),
  ('00000000-0000-0000-0000-0000000000f1', 'Admin'),
  ('00000000-0000-0000-0000-0000000000f2', 'Sin rol')
  on conflict (id) do update set full_name = excluded.full_name;
insert into private.contact_phones (profile_id, phone) values ('00000000-0000-0000-0000-0000000000d2', '59170000022');
insert into public.drivers (profile_id, status, ci_number) values
  ('00000000-0000-0000-0000-0000000000d1', 'approved', 'CI-1'),
  ('00000000-0000-0000-0000-0000000000d2', 'approved', 'CI-2'),
  ('00000000-0000-0000-0000-0000000000d4', 'approved', 'CI-4');
insert into public.vehicles (id, driver_id, plate, ruat) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', '1234ABC', 'RUAT-1');
insert into public.driver_locations (driver_id, location, is_online) values
  ('00000000-0000-0000-0000-0000000000d1', 'SRID=4326;POINT(-63.18 -17.78)', true);

-- Viaje de A (requested, oferta de D1) y viaje de B (asignado a D2 por el camino legal).
insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, expires_at) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000a1', 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min'),
  ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-0000000000b1', 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min');
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000d1', 1000, now() + interval '45 s'),
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-0000000000d2', 1000, now() + interval '45 s');
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at) values
  ('00000000-0000-0000-0000-0000000001b4', '00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-0000000000d4', 1100, now() + interval '45 s');
insert into public.ride_offers (id, ride_id, driver_id, price_cents, status, expires_at) values
  ('00000000-0000-0000-0000-0000000001a4', '00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000d4', 1100, 'rejected', now() + interval '45 s');
update public.ride_offers set status = 'accepted' where id = '00000000-0000-0000-0000-0000000001b1';
update public.ride_offers set status = 'rejected' where id = '00000000-0000-0000-0000-0000000001b4';
update public.rides set status = 'assigned', driver_id = '00000000-0000-0000-0000-0000000000d2',
  accepted_offer_id = '00000000-0000-0000-0000-0000000001b1' where id = '00000000-0000-0000-0000-00000000bb01';
insert into public.ride_track_points (ride_id, recorded_at, location) values
  ('00000000-0000-0000-0000-00000000bb01', now(), 'SRID=4326;POINT(-63.18 -17.78)');

-- Suplanta: fija claims y cambia de rol (volver con reset role).
create function pg_temp.login(u uuid, app jsonb default '{}', usr jsonb default '{}') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated',
    'app_metadata', app, 'user_metadata', usr)::text, true);
  execute 'set local role authenticated';
end $$;
-- Cuenta filas afectadas por un DML (corre como el rol actual).
create function pg_temp.affected(q text) returns int language plpgsql as $$
declare n int; begin execute q; get diagnostics n = row_count; return n; end $$;
grant execute on function pg_temp.affected(text) to public;

-- Estructura
select has_schema('private', 'schema private existe');
select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon sin uso de private');
select is((select count(*)::int from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and has_table_privilege('anon', c.oid, 'select, insert, update, delete')), 0, 'anon sin privilegios en ninguna tabla');
select ok(not has_function_privilege('anon', 'public.get_ride_contact(uuid)', 'execute'), 'anon no ejecuta get_ride_contact');

-- Pasajero A
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.rides where id = '00000000-0000-0000-0000-00000000aa01'), 1, 'A ve su pedido');
select is((select count(*)::int from public.rides where id = '00000000-0000-0000-0000-00000000bb01'), 0, 'A no ve el viaje de B');
select is((select count(*)::int from public.ride_offers), 2, 'A ve solo las ofertas sobre su pedido (D1 activa, D4 rechazada)');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000d4'), 0, 'A no ve el perfil de D4 (oferta rechazada)');
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'), 'Conductor D1', 'A ve el nombre de D1 (ofertó)');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000d2'), 0, 'A no ve el perfil de D2');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 0, 'A no ve el perfil de B');
select is((select count(*)::int from public.vehicles), 1, 'A ve el vehículo de D1 (contraparte)');
select throws_ok($$select ruat from public.vehicles$$, '42501', null, 'ruat no legible por API');
select is((select count(*)::int from information_schema.role_table_grants where grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
    and table_name in ('rides', 'ride_offers', 'ratings', 'sos_events', 'driver_locations', 'ride_track_points', 'config_audit'))
  + (select count(*)::int from information_schema.role_column_grants where grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
    and table_name in ('rides', 'ride_offers', 'ratings', 'sos_events', 'driver_locations', 'ride_track_points', 'config_audit')), 0,
  'authenticated sin escritura en tablas solo-RPC (tabla y columna)');
select throws_ok($$select push_token from public.profiles$$, '42501', null, 'push_token no legible por API');
select throws_ok($$insert into public.rides (passenger_id, origin, destination, offered_fare_cents, expires_at)
  values ('00000000-0000-0000-0000-0000000000a1', 'SRID=4326;POINT(0 0)', 'SRID=4326;POINT(0 0)', 1000, now() + interval '5 min')$$,
  '42501', null, 'authenticated no inserta rides');
select is(pg_temp.affected($$update public.profiles set full_name = 'hack' where id = '00000000-0000-0000-0000-0000000000b1'$$), 0, 'A no actualiza el perfil de otro (0 filas)');
select is(pg_temp.affected($$update public.profiles set full_name = 'A nuevo' where id = '00000000-0000-0000-0000-0000000000a1'$$), 1, 'A actualiza su propio perfil');
select throws_ok($$update public.profiles set rating_avg = 5 where id = '00000000-0000-0000-0000-0000000000a1'$$, '42501', null, 'A no escribe su rating_avg');
select is((select count(*)::int from public.driver_locations), 0, 'pasajero no lee driver_locations');
select throws_ok($$select * from public.get_ride_contact('00000000-0000-0000-0000-00000000bb01')$$, '42501', 'not allowed', 'A sin acceso al contacto del viaje de B');
select throws_ok($$select * from public.get_ride_contact('00000000-0000-0000-0000-00000000aa01')$$, '42501', 'not allowed', 'sin contacto mientras el pedido está requested');
select is((select count(*)::int from public.ride_track_points), 0, 'A no ve track points de B');
select is(pg_temp.affected($$update public.app_config set min_fare_cents = 1$$), 0, 'no admin no edita app_config');
select is((select count(*)::int from public.config_audit), 0, 'no admin no lee config_audit');
reset role;

-- Conductor D1
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::int from public.rides where id = '00000000-0000-0000-0000-00000000aa01'), 1, 'D1 ve el pedido de A (ofertó)');
select is((select count(*)::int from public.rides where id = '00000000-0000-0000-0000-00000000bb01'), 0, 'D1 no ve el viaje de B');
select throws_ok($$update public.drivers set status = 'approved' where profile_id = '00000000-0000-0000-0000-0000000000d1'$$, '42501', null, 'conductor no escribe su status');
select is(pg_temp.affected($$update public.drivers set union_member_number = 'S-1' where profile_id = '00000000-0000-0000-0000-0000000000d1'$$), 0, 'conductor aprobado no edita su fila (0 filas)');
select throws_ok($$insert into public.vehicles (driver_id, plate) values ('00000000-0000-0000-0000-0000000000d1', '9999ZZZ')$$, '42501', null, 'conductor aprobado no agrega vehículo');
select is((select count(*)::int from public.driver_locations), 1, 'D1 lee su propia ubicación');
select throws_ok($$select ci_number from public.drivers$$, '42501', null, 'ci_number no legible');
select throws_ok($$select license_number from public.drivers$$, '42501', null, 'license_number no legible');
select throws_ok($$select rejected_reason from public.drivers$$, '42501', null, 'rejected_reason no legible directo');
select throws_ok($$select soat_expires_at from public.vehicles$$, '42501', null, 'soat_expires_at no legible');
reset role;

-- Conductor D2 / viaje de B
select pg_temp.login('00000000-0000-0000-0000-0000000000d2');
select is((select count(*)::int from public.rides where id = '00000000-0000-0000-0000-00000000bb01'), 1, 'D2 ve su viaje con B');
select is((select phone from public.get_ride_contact('00000000-0000-0000-0000-00000000bb01')), '59170000002', 'D2 obtiene el teléfono de B (respaldo auth.users.phone)');
select is((select count(*)::int from public.ride_track_points), 1, 'D2 ve los track points del viaje');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select is((select phone from public.get_ride_contact('00000000-0000-0000-0000-00000000bb01')), '59170000022', 'B obtiene el teléfono de contacto de D2 (contact_phones)');
reset role;

-- D4 ofertó sobre el pedido de B, pero perdió: ya no ve el viaje ni el perfil de B
select pg_temp.login('00000000-0000-0000-0000-0000000000d4');
select is((select count(*)::int from public.rides), 0, 'D4 (oferta perdedora) no ve el viaje de B');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 0, 'D4 no ve el perfil de B');
select is((select count(*)::int from public.drivers where profile_id = '00000000-0000-0000-0000-0000000000d2'), 0, 'D4 no ve a D2');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 0, 'D4 (oferta rechazada sobre pedido abierto) no ve el perfil de A');
reset role;

-- Viaje de B completado: la relación pasajero-conductor sigue para el historial
update public.rides set status = 'completed', final_fare_cents = 1000, completed_at = now()
  where id = '00000000-0000-0000-0000-00000000bb01';
select pg_temp.login('00000000-0000-0000-0000-0000000000d2');
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 'Pasajero B', 'D2 sigue viendo el perfil de B tras completar');
select is((select count(*)::int from public.rides where id = '00000000-0000-0000-0000-00000000bb01'), 1, 'D2 sigue viendo el viaje completado');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000d4');
select is((select count(*)::int from public.rides), 0, 'D4 sigue sin ver el viaje completado de B');
reset role;

-- Conductor pendiente D3: se registra solo a sí mismo
select pg_temp.login('00000000-0000-0000-0000-0000000000d3');
select lives_ok($$insert into public.drivers (profile_id, license_number) values ('00000000-0000-0000-0000-0000000000d3', 'L-3')$$, 'D3 crea su propia fila de conductor');
select throws_ok($$insert into public.drivers (profile_id) values ('00000000-0000-0000-0000-0000000000f2')$$, '42501', null, 'no se crea conductor para otro usuario');
select lives_ok($$insert into public.driver_documents (driver_id, type, storage_path) values ('00000000-0000-0000-0000-0000000000d3', 'license', '00000000-0000-0000-0000-0000000000d3/license.jpg')$$, 'D3 sube documento a su carpeta');
select throws_ok($$insert into public.driver_documents (driver_id, type, storage_path) values ('00000000-0000-0000-0000-0000000000d3', 'selfie', '00000000-0000-0000-0000-0000000000d1/selfie.jpg')$$, '42501', null, 'documento fuera de su carpeta rechazado');
select throws_ok($$insert into public.driver_documents (driver_id, type, storage_path) values ('00000000-0000-0000-0000-0000000000d1', 'selfie', '00000000-0000-0000-0000-0000000000d1/x.jpg')$$, '42501', null, 'documento a nombre de otro conductor rechazado');
select throws_ok($$select reviewed_by from public.driver_documents$$, '42501', null, 'reviewed_by no legible');
select throws_ok($$insert into public.vehicles (driver_id, plate) values ('00000000-0000-0000-0000-0000000000d1', 'ZZZ111')$$, '42501', null, 'pendiente no crea vehículo de otro');
select lives_ok($$insert into public.vehicles (driver_id, plate) values ('00000000-0000-0000-0000-0000000000d3', 'D3AAA1')$$, 'D3 crea su primer vehículo');
select lives_ok($$insert into public.vehicles (driver_id, plate) values ('00000000-0000-0000-0000-0000000000d3', 'D3AAA2')$$, 'D3 crea su segundo vehículo');
select throws_ok($$insert into public.vehicles (driver_id, plate) values ('00000000-0000-0000-0000-0000000000d3', 'D3AAA3')$$, '42501', null, 'tercer vehículo rechazado (tope 2)');
select is(pg_temp.affected($$update public.vehicles set color = 'rojo' where plate = 'D3AAA1'$$), 1, 'D3 edita su vehículo libre');
reset role;
update public.rides set vehicle_id = (select id from public.vehicles where plate = 'D3AAA1') where id = '00000000-0000-0000-0000-00000000bb01';
select pg_temp.login('00000000-0000-0000-0000-0000000000d3');
select is(pg_temp.affected($$update public.vehicles set color = 'azul' where plate = 'D3AAA1'$$), 0, 'vehículo referenciado por un viaje no se edita');
reset role;
update public.drivers set status = 'rejected', rejected_reason = 'falta CI' where profile_id = '00000000-0000-0000-0000-0000000000d3';
select pg_temp.login('00000000-0000-0000-0000-0000000000d3');
select is((select rejected_reason from public.get_my_driver_application()), 'falta CI', 'D3 lee su motivo de rechazo por RPC');
reset role;

-- Admin vs claim falso en user_metadata
select pg_temp.login('00000000-0000-0000-0000-0000000000f1', '{"role":"admin"}');
select is((select count(*)::int from public.rides), 2, 'admin ve todos los viajes');
select is(pg_temp.affected($$update public.app_config set min_fare_cents = 1500$$), 1, 'admin edita app_config');
select is((select count(*)::int from public.config_audit), 1, 'edición de config queda auditada');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000f2', '{}', '{"role":"admin"}');
select is((select count(*)::int from public.rides), 0, 'user_metadata.role=admin no concede admin');
select throws_ok($$insert into public.drivers (profile_id, status) values ('00000000-0000-0000-0000-0000000000f2', 'approved')$$, '42501', null, 'no se puede insertar un conductor ya aprobado');
reset role;

-- anon
set local role anon;
select throws_ok($$select count(*) from public.rides$$, '42501', null, 'anon no lee rides');
reset role;

select * from finish();
rollback;
