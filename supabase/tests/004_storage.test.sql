begin;
select plan(8);

-- D1 y D2 pendientes; P pasajero sin fila en drivers.
insert into auth.users (id, instance_id, aud, role, phone) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+59170000011'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+59170000012'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+59170000001'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+59170000099');
insert into public.drivers (profile_id, status, ci_number) values
  ('00000000-0000-0000-0000-0000000000d1', 'pending', 'CI-1'),
  ('00000000-0000-0000-0000-0000000000d2', 'pending', 'CI-2');

create function pg_temp.login(u uuid, app jsonb default '{}') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'app_metadata', app)::text, true);
  execute 'set local role authenticated';
end $$;

select is((select public from storage.buckets where id = 'driver-docs'), false, 'driver-docs es privado');

select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('driver-docs', '00000000-0000-0000-0000-0000000000d1/ci.jpg', '00000000-0000-0000-0000-0000000000d1')$$, 'D1 sube a su carpeta');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d2/ci.jpg')$$, '42501', null, 'D1 no sube a la carpeta de D2');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d1/a/b.exe')$$, '42501', null, 'ruta/extensión fuera de regla rechazada');
reset role;
insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d2/ci.jpg');

select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::int from storage.objects where bucket_id = 'driver-docs' and name like '00000000-0000-0000-0000-0000000000d2/%'), 0, 'D1 no ve objetos de D2');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000f1', '{"role":"admin"}');
select is((select count(*)::int from storage.objects where bucket_id = 'driver-docs'), 2, 'admin ve todos');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000a1/ci.jpg')$$, '42501', null, 'pasajero sin drivers no sube');
reset role;

set local role anon;
select is((select count(*)::int from storage.objects where bucket_id = 'driver-docs'), 0, 'anon no ve nada');
reset role;

select * from finish();
rollback;
