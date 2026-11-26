begin;
select plan(18);

-- D1 y D2 pendientes; P pasajero sin fila en drivers.
insert into auth.users (id, instance_id, aud, role, phone) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000011'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000012'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59100000001'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000099'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000013'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000014');
insert into public.drivers (profile_id, status, ci_number) values
  ('00000000-0000-0000-0000-0000000000d1', 'pending', 'CI-1'),
  ('00000000-0000-0000-0000-0000000000d2', 'pending', 'CI-2'),
  ('00000000-0000-0000-0000-0000000000d3', 'approved', 'CI-3'),
  ('00000000-0000-0000-0000-0000000000d4', 'suspended', 'CI-4');

create function pg_temp.affected(q text) returns int language plpgsql as $$
declare n int; begin execute q; get diagnostics n = row_count; return n; end $$;
grant execute on function pg_temp.affected(text) to public;
create function pg_temp.fill_d1() returns void language plpgsql as $$
begin
  for i in 1..19 loop
    insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d1/f' || i || '.jpg');
  end loop;
end $$;
grant execute on function pg_temp.fill_d1() to public;
create function pg_temp.login(u uuid, app jsonb default '{}') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'app_metadata', app)::text, true);
  execute 'set local role authenticated';
end $$;

select is((select public from storage.buckets where id = 'driver-docs'), false, 'driver-docs es privado');

select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('driver-docs', '00000000-0000-0000-0000-0000000000d1/ci.jpg', '00000000-0000-0000-0000-0000000000d1')$$, 'D1 sube a su carpeta');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d2/ci.jpg')$$, '42501', null, 'D1 no sube a la carpeta de D2');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d1/a/b.jpg')$$, '42501', null, 'ruta anidada rechazada');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d1/b.exe')$$, '42501', null, '.exe rechazado');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d1/b.JPG')$$, '42501', null, '.JPG rechazado');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d1/a.b.jpg')$$, '42501', null, 'a.b.jpg rechazado');
select is(pg_temp.affected($$update storage.objects set name = '00000000-0000-0000-0000-0000000000d1/z.jpg' where bucket_id = 'driver-docs'$$), 0, 'dueño no renombra objetos');
select throws_ok($$delete from storage.objects where bucket_id = 'driver-docs'$$, 'Direct deletion from storage tables is not allowed. Use the Storage API instead.', 'borrado directo bloqueado por storage.protect_delete (y sin política DELETE)');
select is((select count(*)::int from storage.objects where bucket_id = 'driver-docs' and name like '00000000-0000-0000-0000-0000000000d1/%'), 1, 'el objeto del dueño sigue ahí');
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

select pg_temp.login('00000000-0000-0000-0000-0000000000d3');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d3/ci.jpg')$$, '42501', null, 'conductor aprobado no sube');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000d4');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d4/ci.jpg')$$, '42501', null, 'conductor suspendido no sube');
reset role;

-- Tope de 20 objetos: D1 ya tiene 1; sube hasta 20 y el 21 falla.
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select pg_temp.fill_d1()$$, 'D1 llega a 20 objetos');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000d1/f20.jpg')$$, '42501', null, 'el objeto 21 se rechaza');
reset role;

select * from finish();
rollback;
