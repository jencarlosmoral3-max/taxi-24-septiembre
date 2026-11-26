begin;
select plan(27);

-- A pasajero, D1 conductor aprobado, F1 ajeno, X cuenta anonimizada. El trigger crea los perfiles.
insert into auth.users (id, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
insert into public.drivers (profile_id, status) values ('00000000-0000-0000-0000-0000000000d1', 'approved');
update public.profiles set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000c1';
insert into private.contact_phones (profile_id, phone) values ('00000000-0000-0000-0000-0000000000d1', '59160000001');
insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, expires_at) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000a1', 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '5 min');
insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000d1', 1000, now() + interval '45 s');

create function pg_temp.login(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

select ok((select relrowsecurity from pg_class where oid = 'private.contact_phones'::regclass), 'contact_phones con RLS activa');
select ok(has_table_privilege('service_role', 'private.contact_phones', 'select, insert, update, delete')
  and has_schema_privilege('service_role', 'private', 'usage'), 'service_role accede a contact_phones');

-- Pasajero: normalización
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select is(public.get_my_phone(), null, 'sin teléfono: get_my_phone null');
select lives_ok($$select public.set_my_phone('+591 70123456')$$, 'acepta +591 con espacio');
select is(public.get_my_phone(), '59170123456', 'normaliza +591 70123456');
select public.set_my_phone('60123456');
select is(public.get_my_phone(), '59160123456', 'normaliza 8 dígitos (y upsert)');
select public.set_my_phone('591-70123456');
select is(public.get_my_phone(), '59170123456', 'normaliza 591-70123456');
select public.set_my_phone('  +591 71234567 ');
select is(public.get_my_phone(), '59171234567', 'recorta espacios alrededor antes de quitar +');
select public.set_my_phone('70123456');
select throws_ok($$select public.set_my_phone('12345')$$, 'P0001', 'invalid_phone', 'rechaza 12345');
select throws_ok($$select public.set_my_phone('59130123456')$$, 'P0001', 'invalid_phone', 'rechaza fijo (prefijo 3)');
select throws_ok($$select public.set_my_phone('7012abcd')$$, 'P0001', 'invalid_phone', 'rechaza letras');
select throws_ok($$select public.set_my_phone(null)$$, 'P0001', 'invalid_phone', 'rechaza null');
select is(public.get_my_phone(), '59170123456', 'un intento inválido no pisa el valor');
select throws_ok($$select * from private.contact_phones$$, '42501', null, 'authenticated no lee private.contact_phones');
reset role;

-- Contacto solo en viaje vivo
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select * from public.get_ride_contact('00000000-0000-0000-0000-00000000aa01')$$, '42501', 'not allowed', 'sin contacto con el pedido requested');
reset role;
update public.ride_offers set status = 'accepted' where id = '00000000-0000-0000-0000-0000000001a1';
update public.rides set status = 'assigned', driver_id = '00000000-0000-0000-0000-0000000000d1',
  accepted_offer_id = '00000000-0000-0000-0000-0000000001a1' where id = '00000000-0000-0000-0000-00000000aa01';
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select is((select phone from public.get_ride_contact('00000000-0000-0000-0000-00000000aa01')), '59160000001', 'pasajero obtiene el teléfono del conductor (assigned)');
select throws_ok($$select public.set_my_phone('70123456')$$, 'P0001', 'phone_locked_active_ride', 'pasajero con viaje activo no cambia su teléfono');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select is((select phone from public.get_ride_contact('00000000-0000-0000-0000-00000000aa01')), '59170123456', 'conductor obtiene el teléfono del pasajero (assigned)');
reset role;
update public.rides set status = 'in_progress' where id = '00000000-0000-0000-0000-00000000aa01';
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select is((select phone from public.get_ride_contact('00000000-0000-0000-0000-00000000aa01')), '59170123456', 'conductor obtiene el teléfono en in_progress');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000f1');
select throws_ok($$select * from public.get_ride_contact('00000000-0000-0000-0000-00000000aa01')$$, '42501', 'not allowed', 'un tercero no obtiene el contacto');
select is(public.get_my_phone(), null, 'tercero: get_my_phone null');
reset role;
update public.rides set status = 'cancelled_passenger', cancelled_at = now()
  where id = '00000000-0000-0000-0000-00000000aa01';
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select * from public.get_ride_contact('00000000-0000-0000-0000-00000000aa01')$$, '42501', 'not allowed', 'sin contacto con el viaje cancelado');
select lives_ok($$select public.set_my_phone('70123456')$$, 'sin viaje activo el pasajero vuelve a poder cambiar su teléfono');
reset role;

-- Conductor aprobado: teléfono fijo. Cuenta anonimizada: rechazada.
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select public.set_my_phone('70123456')$$, 'P0001', 'phone_locked', 'conductor aprobado no cambia su teléfono');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$select public.set_my_phone('70123456')$$, 'P0001', 'account_deleted', 'cuenta anonimizada no fija teléfono');
reset role;

-- anon
set local role anon;
select throws_ok($$select public.set_my_phone('70123456')$$, '42501', null, 'anon no ejecuta set_my_phone');
select throws_ok($$select public.get_my_phone()$$, '42501', null, 'anon no ejecuta get_my_phone');
reset role;

select * from finish();
rollback;
