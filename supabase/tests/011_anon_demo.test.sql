begin;
select plan(30);

-- n1 usuario normal; x1 y x2 anónimos (is_anonymous = true, como el sign-in anónimo de Supabase).
insert into auth.users (id, instance_id, aud, role, phone, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000101', false),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true);

create function pg_temp.login(u uuid, anon boolean default false) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', u, 'role', 'authenticated', 'is_anonymous', anon)::text, true);
  execute 'set local role authenticated';
end $$;

-- Helper
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
select is(private.is_anon(), false, 'usuario normal: is_anon false');
reset role;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000e1', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(private.is_anon(), false, 'sin claim is_anonymous: false');

-- Anónimo: RPC con efectos rechazados
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000e2', true);
select is(private.is_anon(), true, 'anónimo: is_anon true');
select throws_ok($$select public.set_my_phone('+59170000123')$$, '42501', 'not_allowed', 'anon: set_my_phone');
select throws_ok($$select public.create_ride(0::float8, 0::float8, 0::float8, 0::float8, 'a', 'b', 1000, 1::smallint, null)$$, '42501', 'not_allowed', 'anon: create_ride');
select throws_ok($$select public.get_nearby_requests()$$, '42501', 'not_allowed', 'anon: get_nearby_requests');
select throws_ok($$select public.make_offer(gen_random_uuid(), 1000)$$, '42501', 'not_allowed', 'anon: make_offer');
select throws_ok($$select public.accept_offer(gen_random_uuid())$$, '42501', 'not_allowed', 'anon: accept_offer');
select throws_ok($$select public.driver_arrived(gen_random_uuid())$$, '42501', 'not_allowed', 'anon: driver_arrived');
select throws_ok($$select public.start_ride(gen_random_uuid())$$, '42501', 'not_allowed', 'anon: start_ride');
select throws_ok($$select public.complete_ride(gen_random_uuid())$$, '42501', 'not_allowed', 'anon: complete_ride');
select throws_ok($$select public.cancel_ride(gen_random_uuid())$$, '42501', 'not_allowed', 'anon: cancel_ride');
select throws_ok($$select public.rate_ride(gen_random_uuid(), 5::smallint)$$, '42501', 'not_allowed', 'anon: rate_ride');
select throws_ok($$select public.trigger_sos(0::float8, 0::float8, gen_random_uuid())$$, '42501', 'not_allowed', 'anon: trigger_sos');
select throws_ok($$select public.upsert_driver_location(0::float8, 0::float8, 0::real, 0::real, true)$$, '42501', 'not_allowed', 'anon: upsert_driver_location');

-- Anónimo: escrituras directas bloqueadas por RLS restrictiva
select throws_ok($$insert into public.drivers (profile_id, union_member_number, license_number, ci_number) values ('00000000-0000-0000-0000-0000000000e2', 'S1', 'L1', 'C1')$$, '42501', null, 'anon: insert drivers');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('driver-docs', '00000000-0000-0000-0000-0000000000e2/ci.jpg')$$, '42501', null, 'anon: upload driver-docs');
with u as (update public.profiles set full_name = 'x' where id = '00000000-0000-0000-0000-0000000000e2' returning 1)
select is((select count(*) from u), 0::bigint, 'anon: update profiles no afecta filas');
select isnt((select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000e2'), 0::bigint, 'anon: lee su propio perfil');

-- Usuario normal sin cambios
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$select public.set_my_phone('+59170000101')$$, 'normal: set_my_phone');
select lives_ok($$insert into public.drivers (profile_id, union_member_number, license_number, ci_number) values ('00000000-0000-0000-0000-0000000000e1', 'S2', 'L2', 'C2')$$, 'normal: insert drivers');
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('driver-docs', '00000000-0000-0000-0000-0000000000e1/ci.jpg', '00000000-0000-0000-0000-0000000000e1')$$, 'normal: upload driver-docs');
with u as (update public.profiles set full_name = 'x' where id = '00000000-0000-0000-0000-0000000000e1' returning 1)
select is((select count(*) from u), 1::bigint, 'normal: update profiles afecta su fila');

-- Geo: anónimo 30/día, normal 100/día
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000e2', true);
select lives_ok($$select public.consume_geo_quota() from generate_series(1, 30)$$, 'anon: 30 llamadas diarias');
select throws_ok($$select public.consume_geo_quota()$$, 'P0001', 'rate_limited', 'anon: la 31 se rechaza');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$select public.consume_geo_quota() from generate_series(1, 31)$$, 'normal: 31 llamadas pasan');

-- Global anónimo (500): con 499 pasa un crédito y el siguiente falla; el normal no se ve afectado.
reset role;
insert into private.geo_usage_anon_global (day, hits) values ((now() at time zone 'utc')::date, 499)
on conflict (day) do update set hits = 499;
select pg_temp.login('00000000-0000-0000-0000-0000000000e3', true);
select lives_ok($$select public.consume_geo_quota() from generate_series(1, 2)$$, 'anon e3: 2 cuotas');
select lives_ok($$select public.consume_geo_upstream_credit()$$, 'anon: crédito global anónimo 500 pasa');
select throws_ok($$select public.consume_geo_upstream_credit()$$, 'P0001', 'rate_limited', 'anon: crédito 501 se rechaza');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$select public.consume_geo_upstream_credit()$$, 'normal: crédito pasa con el cupo anónimo lleno');

select * from finish();
rollback;
