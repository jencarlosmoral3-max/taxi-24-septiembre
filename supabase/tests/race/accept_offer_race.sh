#!/usr/bin/env bash
# B-07 CA: concurrencia de accept_offer contra una DB real (no corre en `supabase test db`).
# Uso: supabase/tests/race/accept_offer_race.sh postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Solo para bases locales/de prueba: inserta usuarios, viajes y ofertas nuevos en cada corrida (ids aleatorios) y no los borra.
set -euo pipefail
URL=${1:?uso: $0 <DB_URL>}
q() { psql "$URL" -X -Atq -v ON_ERROR_STOP=1 "$@"; }

# Sesión como usuario autenticado: toma el lock, duerme con la transacción abierta para forzar el solape.
as_user() { # $1 uid, $2 offer id, $3 archivo de salida, $4 segundos de pausa con locks tomados
  psql "$URL" -X -At -v ON_ERROR_STOP=0 > "$3" 2>&1 <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '$1', 'role', 'authenticated')::text, true);
select 'ACCEPTED ride=' || public.accept_offer('$2');
select pg_sleep($4);
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

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
has() { grep -q "$2" "$1" || { echo "--- salida de $1:"; cat "$1"; fail "se esperaba '$2'"; }; }

echo "== Escenario 1: un pedido, dos ofertas de conductores distintos, aceptadas a la vez =="
P1=$(new); D1=$(new); D2=$(new); R1=$(new); O1=$(new); O2=$(new)
seed_user "$P1"; seed_driver "$D1"; seed_driver "$D2"; seed_ride "$R1" "$P1"
seed_offer "$O1" "$R1" "$D1"; seed_offer "$O2" "$R1" "$D2"
as_user "$P1" "$O1" "$TMP/1a" 1.5 & sleep 0.4; as_user "$P1" "$O2" "$TMP/1b" 0.1 & wait
has "$TMP/1a" "ACCEPTED ride=$R1"; has "$TMP/1b" "ride_not_open"
assigned=$(count "select count(*) from public.rides where id = '$R1' and status = 'assigned'")
accepted=$(count "select count(*) from public.ride_offers where ride_id = '$R1' and status = 'accepted'")
busy=$(count "select count(*) from public.rides where driver_id in ('$D1', '$D2') and status in ('assigned', 'driver_arrived', 'in_progress')")
echo "rides asignados=$assigned ofertas aceptadas=$accepted viajes activos de los dos conductores=$busy; perdedor: ride_not_open"
[ "$assigned" = 1 ] && [ "$accepted" = 1 ] && [ "$busy" = 1 ] || fail "escenario 1"

echo "== Escenario 2: un conductor con ofertas en dos pedidos, aceptadas a la vez por dos pasajeros =="
P2=$(new); P3=$(new); D3=$(new); R2=$(new); R3=$(new); O3=$(new); O4=$(new)
seed_user "$P2"; seed_user "$P3"; seed_driver "$D3"; seed_ride "$R2" "$P2"; seed_ride "$R3" "$P3"
seed_offer "$O3" "$R2" "$D3"; seed_offer "$O4" "$R3" "$D3"
as_user "$P2" "$O3" "$TMP/2a" 1.5 & sleep 0.4; as_user "$P3" "$O4" "$TMP/2b" 0.1 & wait
has "$TMP/2a" "ACCEPTED ride=$R2"; has "$TMP/2b" "driver_busy"
active=$(count "select count(*) from public.rides where driver_id = '$D3' and status in ('assigned', 'driver_arrived', 'in_progress')")
assigned=$(count "select count(*) from public.rides where id in ('$R2', '$R3') and status = 'assigned'")
echo "viajes activos del conductor=$active pedidos asignados=$assigned; perdedor: driver_busy"
[ "$active" = 1 ] && [ "$assigned" = 1 ] || fail "escenario 2"

echo "== Escenario 3: ofertas cruzadas (D y D' ofertan a R y R'), P acepta D@R y P' acepta D'@R' a la vez (${ITER:-10} rondas) =="
for i in $(seq 1 "${ITER:-10}"); do
  PA=$(new); PB=$(new); DA=$(new); DB=$(new); RA=$(new); RB=$(new)
  seed_user "$PA"; seed_user "$PB"; seed_driver "$DA"; seed_driver "$DB"; seed_ride "$RA" "$PA"; seed_ride "$RB" "$PB"
  OAA=$(new); OAB=$(new); OBA=$(new); OBB=$(new)
  seed_offer "$OAA" "$RA" "$DA"; seed_offer "$OAB" "$RB" "$DA"; seed_offer "$OBA" "$RA" "$DB"; seed_offer "$OBB" "$RB" "$DB"
  # sin pausa previa: la pausa va tras el accept, así que los dos accept solapan sus locks de verdad
  as_user "$PA" "$OAA" "$TMP/3a" 0.3 & as_user "$PB" "$OBB" "$TMP/3b" 0.3 & wait
  if grep -qi "deadlock" "$TMP/3a" "$TMP/3b"; then cat "$TMP/3a" "$TMP/3b"; fail "deadlock en escenario 3 (ronda $i)"; fi
  has "$TMP/3a" "ACCEPTED ride=$RA"; has "$TMP/3b" "ACCEPTED ride=$RB"
  n=$(count "select count(*) from public.rides where id in ('$RA', '$RB') and status = 'assigned'")
  [ "$n" = 2 ] || fail "escenario 3 ronda $i: asignados=$n"
done
echo "escenario 3: $(( ${ITER:-10} )) rondas sin deadlock, ambos pedidos asignados"
echo "OK: exactamente una aceptación gana en los escenarios 1 y 2; sin deadlocks en el 3"
