-- Vyro B-10: Broadcast privado (políticas sobre realtime.messages) y GPS de flota.
-- Las políticas se evalúan al unirse al canal; realtime.topic() es el topic del canal que se intenta unir.
-- Igualdad exacta (nunca LIKE) y extension = 'broadcast'. anon no tiene políticas = sin acceso.
-- SELECT: driver:<uid> solo si es conductor APROBADO; rider:<uid> propio; trip:<ride> solo pasajero/conductor asignado MIENTRAS
-- el viaje está activo (assigned/driver_arrived/in_progress). Conocer el id del viaje no basta.
-- INSERT: NO hay política: ningún cliente escribe en ningún topic. Solo el servidor emite (private.notify, security definer).

-- Topics de viajes activos de los que el usuario es parte (una vez por consulta con `in (select ...)`).
create function private.my_active_trip_topics() returns setof text
language sql stable security definer set search_path = '' as $$
  select 'trip:' || r.id from public.rides r
  where (r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid()))
    and r.status in ('assigned', 'driver_arrived', 'in_progress')
$$;
revoke all on function private.my_active_trip_topics() from public, anon;
grant execute on function private.my_active_trip_topics() to authenticated;

create policy realtime_messages_select on realtime.messages for select to authenticated
  using (
    extension = 'broadcast' and (
      (select realtime.topic()) = 'rider:' || (select auth.uid())
      or ((select realtime.topic()) = 'driver:' || (select auth.uid())
          and exists (select 1 from public.drivers d where d.profile_id = (select auth.uid()) and d.status = 'approved'))
      or (select realtime.topic()) in (select private.my_active_trip_topics())
    ));

-- GPS de flota. driver_locations ya trae fillfactor/autovacuum de B-01.
-- La fila guarda la última posición ACEPTADA y su updated_at: son el ancla de la velocidad.
--  * Con fila previa y (fuera de línea o última aceptación hace < 5 s): solo se actualiza is_online y se ignora la posición
--    (no se mueve el ancla, así pasos chicos y rápidos no la desplazan).
--  * Si no, velocidad implícita = distancia / segundos desde el ancla (sin ventana máxima); > 120 km/h = implausible_location
--    y el rechazo no mueve el ancla.
-- Con viaje activo se emite 'pos' por trip:<ride> (server-side) y, solo en in_progress, se guarda punto de historial.
-- El límite de 1 por 5 s por viaje sale de la regla de 5 s de arriba: solo una posición aceptada cada >= 5 s llega aquí.
create function public.upsert_driver_location(
  p_lng double precision, p_lat double precision, p_heading real default null, p_speed real default null,
  p_is_online boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_loc extensions.geography;
  v_prev public.driver_locations;
  v_status public.ride_status;
  v_ride uuid;
begin
  if v_uid is null or not exists (select 1 from public.drivers d where d.profile_id = v_uid and d.status = 'approved') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_lng is null or p_lat is null or p_lng not between -180 and 180 or p_lat not between -90 and 90
     or p_is_online is null then
    raise exception 'invalid_coordinates' using errcode = 'P0001';
  end if;
  -- not between también rechaza NaN e Infinity.
  if (p_heading is not null and p_heading not between 0 and 360) or (p_speed is not null and p_speed not between 0 and 100) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  select r.id, r.status into v_ride, v_status from public.rides r
  where r.driver_id = v_uid and r.status in ('assigned', 'driver_arrived', 'in_progress');
  if v_ride is not null and not p_is_online then
    raise exception 'driver_busy' using errcode = 'P0001';
  end if;

  v_loc := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  select * into v_prev from public.driver_locations where driver_id = v_uid for update;
  if found then
    if not p_is_online or v_prev.updated_at > now() - interval '5 seconds' then
      if v_prev.is_online is distinct from p_is_online then
        update public.driver_locations set is_online = p_is_online where driver_id = v_uid;
      end if;
      return;
    end if;
    if extensions.st_distance(v_prev.location, v_loc) / extract(epoch from now() - v_prev.updated_at) * 3.6 > 120 then
      raise exception 'implausible_location' using errcode = 'P0001';
    end if;
  end if;

  insert into public.driver_locations (driver_id, location, heading, speed, is_online, updated_at)
  values (v_uid, v_loc, p_heading, p_speed, p_is_online, now())
  on conflict (driver_id) do update
    set location = excluded.location, heading = excluded.heading, speed = excluded.speed,
        is_online = excluded.is_online, updated_at = excluded.updated_at;

  if v_ride is not null then
    perform private.notify('trip:' || v_ride, 'pos', jsonb_build_object(
      'lng', p_lng, 'lat', p_lat, 'heading', p_heading, 'at', now()));
    if v_status = 'in_progress' then
      insert into public.ride_track_points (ride_id, recorded_at, location) values (v_ride, now(), v_loc)
      on conflict do nothing;
    end if;
  end if;
end $$;
revoke all on function public.upsert_driver_location(double precision, double precision, real, real, boolean) from public, anon;
grant execute on function public.upsert_driver_location(double precision, double precision, real, real, boolean) to authenticated;
