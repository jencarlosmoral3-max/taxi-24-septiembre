#!/usr/bin/env bash
# B-07 CA: concurrencia de accept_offer contra una DB real (no corre en `supabase test db`).
# Uso: supabase/tests/race/accept_offer_race.sh postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Solo para bases locales/de prueba: inserta usuarios, viajes y ofertas nuevos en cada corrida (ids aleatorios) y no los borra.
set -euo pipefail
URL=${1:?uso: $0 <DB_URL>}
q() { psql "$URL" -X -Atq -v ON_ERROR_STOP=1 "$@"; }

# Sesión como usuario autenticado: toma el lock, duerme con la transacción abierta para forzar el solape.
as_user() { # $1 uid, $2 offer id, $3 etiqueta
  psql "$URL" -X -At -v ON_ERROR_STOP=0 2>&1 <<SQL | sed "s/^/[$3] /"
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '$1', 'role', 'authenticated')::text, true);
select 'ACCEPTED ride=' || public.accept_offer('$2');
select pg_sleep(1.5);
commit;
SQL
}

seed_user() { q -c "insert into auth.users (id, instance_id, aud, role) values ('$1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  insert into public.profiles (id, full_name) values ('$1', 'race $1');"; }
seed_driver() { seed_user "$1"; q -c "insert into public.drivers (profile_id, status) values ('$1', 'approved');
  insert into public.vehicles (driver_id, plate) values ('$1', 'R' || upper(substr(replace('$1', '-', ''), 1, 8)));"; }
seed_ride() { q -c "insert into public.rides (id, passenger_id, origin, destination, offered_fare_cents, expires_at)
  values ('$1', '$2', 'SRID=4326;POINT(-63.18 -17.78)', 'SRID=4326;POINT(-63.19 -17.79)', 1000, now() + interval '10 min');"; }
seed_offer() { q -c "insert into public.ride_offers (id, ride_id, driver_id, price_cents, expires_at)
  values ('$1', '$2', '$3', 1000, now() + interval '10 min');"; }
new() { q -c "select gen_random_uuid()"; }
count() { q -c "$1"; }
fail() { echo "FAIL: $1"; exit 1; }

echo "== Escenario 1: un pedido, dos ofertas de conductores distintos, aceptadas a la vez =="
P1=$(new); D1=$(new); D2=$(new); R1=$(new); O1=$(new); O2=$(new)
seed_user "$P1"; seed_driver "$D1"; seed_driver "$D2"; seed_ride "$R1" "$P1"
seed_offer "$O1" "$R1" "$D1"; seed_offer "$O2" "$R1" "$D2"
as_user "$P1" "$O1" S1 & sleep 0.4; as_user "$P1" "$O2" S2 & wait
assigned=$(count "select count(*) from public.rides where id = '$R1' and status = 'assigned'")
accepted=$(count "select count(*) from public.ride_offers where ride_id = '$R1' and status = 'accepted'")
busy=$(count "select count(*) from public.rides where driver_id in ('$D1', '$D2') and status in ('assigned', 'driver_arrived', 'in_progress')")
echo "rides asignados=$assigned ofertas aceptadas=$accepted viajes activos de los dos conductores=$busy"
[ "$assigned" = 1 ] && [ "$accepted" = 1 ] && [ "$busy" = 1 ] || fail "escenario 1"

echo "== Escenario 2: un conductor con ofertas en dos pedidos, aceptadas a la vez por dos pasajeros =="
P2=$(new); P3=$(new); D3=$(new); R2=$(new); R3=$(new); O3=$(new); O4=$(new)
seed_user "$P2"; seed_user "$P3"; seed_driver "$D3"; seed_ride "$R2" "$P2"; seed_ride "$R3" "$P3"
seed_offer "$O3" "$R2" "$D3"; seed_offer "$O4" "$R3" "$D3"
as_user "$P2" "$O3" S1 & sleep 0.4; as_user "$P3" "$O4" S2 & wait
active=$(count "select count(*) from public.rides where driver_id = '$D3' and status in ('assigned', 'driver_arrived', 'in_progress')")
assigned=$(count "select count(*) from public.rides where id in ('$R2', '$R3') and status = 'assigned'")
echo "viajes activos del conductor=$active pedidos asignados=$assigned"
[ "$active" = 1 ] && [ "$assigned" = 1 ] || fail "escenario 2"
echo "OK: exactamente una aceptación gana en ambos escenarios"
