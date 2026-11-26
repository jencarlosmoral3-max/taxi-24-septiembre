begin;
select plan(26);

insert into auth.users (id, instance_id, aud, role, phone)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000001'),
       ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000003'),
       ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '59170000002');

create function pg_temp.login(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- Config conocida: base 500, 300/km, 50/min, mínimo 1000.
update public.app_config set base_cents = 500, per_km_cents = 300, per_min_cents = 50, min_fare_cents = 1000;

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
-- 5 km, 10 min = 500 + 1500 + 500 = 2500 (ya redondo)
select is(public.suggest_fare(5000, 600), 2500, 'fórmula base + km + min');
-- 5.1 km, 10 min = 500 + 1530 + 500 = 2530 -> 2600
select is(public.suggest_fare(5100, 600), 2600, 'redondea hacia arriba a Bs entero');
-- 1 km, 60 s = 500 + 300 + 50 = 850 -> 900 -> mínimo 1000
select is(public.suggest_fare(1000, 60), 1000, 'nunca menor al mínimo');
select is(public.suggest_fare(0, 0), 1000, 'cero distancia/duración -> mínimo');
select is(public.suggest_fare(200000, 21600), (500 + 300 * 200 + 50 * 360 + 99) / 100 * 100, 'límites máximos válidos');
select throws_ok($$select public.suggest_fare(null, 60)$$, 'P0001', 'invalid_route', 'distancia nula');
select throws_ok($$select public.suggest_fare(1000, null)$$, 'P0001', 'invalid_route', 'duración nula');
select throws_ok($$select public.suggest_fare(-1, 60)$$, 'P0001', 'invalid_route', 'distancia negativa');
select throws_ok($$select public.suggest_fare(1000, -1)$$, 'P0001', 'invalid_route', 'duración negativa');
select throws_ok($$select public.suggest_fare(200001, 60)$$, 'P0001', 'invalid_route', 'distancia > 200 km');
select throws_ok($$select public.suggest_fare(1000, 21601)$$, 'P0001', 'invalid_route', 'duración > 6 h');

-- Aritmética exacta: base 500 + 300/km*0.56 (168) + 30/min*64s (32) = 700
reset role;
update public.app_config set per_min_cents = 30, min_fare_cents = 100;
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select is(public.suggest_fare(560, 64), 700, 'entero exacto sin flotantes');
select is(public.suggest_fare(561, 64), 800, '700.3 sube a Bs entero');
reset role;
update public.app_config set per_min_cents = 50, min_fare_cents = 1000;
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');

-- Cuota: 60 permitidas, la 61 falla; otro usuario no se ve afectado.
select lives_ok($$select public.consume_geo_quota() from generate_series(1, 60)$$, '60 llamadas permitidas');
select throws_ok($$select public.consume_geo_quota()$$, 'P0001', 'rate_limited', 'la 61 se rechaza');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select lives_ok($$select public.consume_geo_quota()$$, 'cuota independiente por usuario');

-- Tope diario por usuario (100): con el contador en 99 pasa la 100 y la 101 falla.
reset role;
insert into private.geo_usage_day (user_id, day, hits)
values ('00000000-0000-0000-0000-0000000000b1', (now() at time zone 'utc')::date, 99)
on conflict (user_id, day) do update set hits = 99;
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select lives_ok($$select public.consume_geo_quota()$$, 'la llamada diaria 100 pasa');
select throws_ok($$select public.consume_geo_quota()$$, 'P0001', 'rate_limited', 'la diaria 101 se rechaza');

-- Tope global (2700): con el contador en 2699 pasa una y la siguiente (otro usuario) falla.
reset role;
insert into private.geo_usage_global (day, hits) values ((now() at time zone 'utc')::date, 2699)
on conflict (day) do update set hits = 2699;
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$select public.consume_geo_upstream_credit()$$, 'la global 2700 pasa');
select throws_ok($$select public.consume_geo_upstream_credit()$$, 'P0001', 'rate_limited', 'la global 2701 se rechaza');
reset role;
select is((select hits from private.geo_usage_global where day = (now() at time zone 'utc')::date), 2700, 'el rechazo no cuenta');
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');

select hasnt_function('public', 'geo_upstream_slot', array['text'], 'compuerta upstream eliminada');

reset role;
delete from public.app_config;
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select public.suggest_fare(1000, 60)$$, 'P0001', 'config_missing', 'sin fila de config');
reset role;
set local role anon;
select throws_ok($$select public.suggest_fare(1000, 60)$$, '42501', null, 'anon no puede suggest_fare');
select throws_ok($$select public.consume_geo_quota()$$, '42501', null, 'anon no puede consume_geo_quota');
select throws_ok($$select public.consume_geo_upstream_credit()$$, '42501', null, 'anon no puede consume_geo_upstream_credit');

select * from finish();
rollback;
