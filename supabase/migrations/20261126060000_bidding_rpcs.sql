-- Vyro B-05..B-09: RPCs de la puja, transiciones de estado y expiración.
-- Convenciones:
--  * security definer + search_path = '' + nombres calificados (PostGIS siempre extensions.*).
--  * Errores de negocio: SQLSTATE P0001 con un código corto en el mensaje (fare_below_minimum, ride_not_open, ...).
--    Autorización: SQLSTATE 42501 con mensaje not_allowed.
--  * Orden de locks: SIEMPRE el ride primero y las ofertas después. accept_offer asigna (UPDATE de rides, que choca con el
--    índice único "1 viaje activo por conductor") ANTES de tocar ofertas, así dos accept del mismo conductor se serializan en
--    el índice. Pero las ofertas de OTROS pedidos (ofertas cruzadas D@R y D2@R' aceptadas a la vez) sí pueden formar un ciclo
--    entre dos accept: por eso accept_offer rechaza/expira ofertas con FOR UPDATE SKIP LOCKED (nunca espera). Lo que se salte
--    lo está modificando otra transacción (otro accept, el cron) que lo deja en un estado terminal; a lo sumo queda una oferta
--    activa huérfana que accept_offer rechaza (ride_not_open/driver_busy) y que caduca por TTL. expire_stale también usa SKIP LOCKED.
--  * La corrección no depende de pg_cron: cada RPC valida expires_at por su cuenta.
--  * Cancelar un viaje en in_progress NO está permitido (el viaje se cierra con complete_ride; emergencias van por SOS, B-15).
-- Cada función: revoke all from public, anon + grant execute to authenticated explícito (nada por defecto).

-- Antigüedad máxima de la ubicación de un conductor para recibir/hacer ofertas (una sola definición).
create function private.location_max_age() returns interval language sql immutable set search_path = '' as $$ select interval '60 seconds' $$;
revoke all on function private.location_max_age() from public, anon, authenticated;

-- Límites de texto (entrada de usuario que viaja por Broadcast/push).
alter table public.rides
  add constraint rides_origin_text_len check (origin_text is null or char_length(origin_text) <= 200),
  add constraint rides_destination_text_len check (destination_text is null or char_length(destination_text) <= 200),
  add constraint rides_comment_len check (comment is null or char_length(comment) <= 280),
  add constraint rides_cancel_reason_len check (cancel_reason is null or char_length(cancel_reason) <= 500);

-- Notificación Broadcast privado. Nunca debe romper la transacción de negocio (Realtime puede no estar disponible).
-- Topics: driver:<uuid>, rider:<uuid>, trip:<ride uuid>.
-- B-11 (push FCM): se engancha aquí mismo, junto al realtime.send, usando p_topic/p_event/p_payload (pg_net hacia la edge function).
create function private.notify(p_topic text, p_event text, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then
    return;
  end if;
  begin
    perform realtime.send(p_payload, p_event, p_topic, true);
  exception when others then
    raise warning 'notify % % failed: %', p_topic, p_event, sqlerrm;
  end;
end $$;
revoke all on function private.notify(text, text, jsonb) from public, anon, authenticated;

-- Conductores a notificar para un pedido (B-05). Expuesta en private para poder testear el conjunto sin realtime.
-- Los 25 más cercanos (limita el fan-out del Broadcast).
create function private.nearby_driver_ids(p_ride_id uuid) returns table (driver_id uuid, distance_m double precision)
language sql stable security definer set search_path = '' as $$
  select dl.driver_id, extensions.st_distance(dl.location, r.origin)
  from public.rides r
  cross join public.app_config c
  join public.driver_locations dl on extensions.st_dwithin(dl.location, r.origin, c.search_radius_m)
  join public.drivers d on d.profile_id = dl.driver_id and d.status = 'approved'
  where r.id = p_ride_id
    and dl.is_online
    and dl.updated_at > now() - private.location_max_age()
    and dl.driver_id <> r.passenger_id
    and not exists (select 1 from public.rides a where a.driver_id = dl.driver_id
                    and a.status in ('assigned', 'driver_arrived', 'in_progress'))
  order by dl.location operator(extensions.<->) r.origin
  limit 25
$$;
revoke all on function private.nearby_driver_ids(uuid) from public, anon, authenticated;

-- B-05 ----------------------------------------------------------------------------------------------------------------
create function public.create_ride(
  p_origin_lng double precision, p_origin_lat double precision,
  p_dest_lng double precision, p_dest_lat double precision,
  p_origin_text text, p_dest_text text,
  p_offered_fare_cents integer, p_passenger_count smallint default 1, p_comment text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_cfg public.app_config;
  v_id uuid;
  v_near record;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid and p.deleted_at is null) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_origin_lng is null or p_origin_lat is null or p_dest_lng is null or p_dest_lat is null
     or p_origin_lng not between -180 and 180 or p_dest_lng not between -180 and 180
     or p_origin_lat not between -90 and 90 or p_dest_lat not between -90 and 90 then
    raise exception 'invalid_coordinates' using errcode = 'P0001';
  end if;
  if p_passenger_count is null or p_passenger_count not between 1 and 8 then
    raise exception 'invalid_passenger_count' using errcode = 'P0001';
  end if;
  select * into v_cfg from public.app_config;
  if p_offered_fare_cents is null or p_offered_fare_cents < v_cfg.min_fare_cents then
    raise exception 'fare_below_minimum' using errcode = 'P0001';
  end if;

  -- Un pedido propio vencido no debe bloquear el nuevo aunque el cron no haya corrido (ride primero, ofertas después).
  update public.rides set status = 'expired' where passenger_id = v_uid and status = 'requested' and expires_at <= now();
  update public.ride_offers set status = 'expired' where status = 'active'
    and ride_id in (select r.id from public.rides r where r.passenger_id = v_uid and r.status = 'expired');

  if (select count(*) from public.rides r where r.passenger_id = v_uid and r.created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  begin
    insert into public.rides (passenger_id, origin, destination, origin_text, destination_text, offered_fare_cents,
                              passenger_count, comment, expires_at)
    values (v_uid,
            extensions.st_setsrid(extensions.st_makepoint(p_origin_lng, p_origin_lat), 4326)::extensions.geography,
            extensions.st_setsrid(extensions.st_makepoint(p_dest_lng, p_dest_lat), 4326)::extensions.geography,
            p_origin_text, p_dest_text, p_offered_fare_cents, p_passenger_count, p_comment,
            now() + make_interval(secs => v_cfg.ride_ttl_s))
    returning id into v_id;
  exception
    when unique_violation then -- único índice único (aparte de la PK uuid): rides_one_open_per_passenger
      raise exception 'passenger_has_open_ride' using errcode = 'P0001';
    when check_violation then -- longitudes de texto
      raise exception 'invalid_input' using errcode = 'P0001';
  end;

  for v_near in select * from private.nearby_driver_ids(v_id) loop
    perform private.notify('driver:' || v_near.driver_id, 'ride_requested', jsonb_build_object(
      'ride_id', v_id, 'origin_text', p_origin_text, 'destination_text', p_dest_text,
      'offered_fare_cents', p_offered_fare_cents, 'distance_m', round(v_near.distance_m::numeric)));
  end loop;
  return v_id;
end $$;
revoke all on function public.create_ride(double precision, double precision, double precision, double precision, text, text, integer, smallint, text) from public, anon;
grant execute on function public.create_ride(double precision, double precision, double precision, double precision, text, text, integer, smallint, text) to authenticated;

-- Pedidos abiertos y vigentes cerca del conductor (app del conductor, C-04).
create function public.get_nearby_requests() returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from public.drivers d where d.profile_id = v_uid and d.status = 'approved') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select jsonb_build_object(
      'ride_id', r.id, 'origin_text', r.origin_text, 'destination_text', r.destination_text,
      'origin_lng', extensions.st_x(r.origin::extensions.geometry), 'origin_lat', extensions.st_y(r.origin::extensions.geometry),
      'dest_lng', extensions.st_x(r.destination::extensions.geometry), 'dest_lat', extensions.st_y(r.destination::extensions.geometry),
      'offered_fare_cents', r.offered_fare_cents, 'passenger_count', r.passenger_count, 'comment', r.comment,
      'distance_m', round(extensions.st_distance(dl.location, r.origin)::numeric), 'expires_at', r.expires_at)
    from public.driver_locations dl
    cross join public.app_config c
    join public.rides r on r.status = 'requested' and r.expires_at > now() and r.passenger_id <> v_uid
      and extensions.st_dwithin(r.origin, dl.location, c.search_radius_m)
    where dl.driver_id = v_uid and dl.is_online and dl.updated_at > now() - private.location_max_age()
      and not exists (select 1 from public.rides a where a.driver_id = v_uid and a.status in ('assigned', 'driver_arrived', 'in_progress'))
    order by r.created_at desc
    limit 50;
end $$;
revoke all on function public.get_nearby_requests() from public, anon;
grant execute on function public.get_nearby_requests() to authenticated;

-- B-06 ----------------------------------------------------------------------------------------------------------------
-- Reemplazo de oferta: la anterior pasa a 'withdrawn' y se inserta una nueva (conserva el historial de contraofertas, a
-- diferencia de insert ... on conflict do update, que la pisaría). Serializado por el FOR UPDATE del ride.
-- Carrera aceptada: si el conductor es asignado en otro pedido justo mientras ofertaba aquí, puede quedar una oferta activa
-- huérfana; accept_offer la rechaza con driver_busy y expira por TTL.
create function public.make_offer(p_ride_id uuid, p_price_cents integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_cfg public.app_config;
  v_ride public.rides;
  v_id uuid;
begin
  if v_uid is null or not exists (select 1 from public.drivers d where d.profile_id = v_uid and d.status = 'approved') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_cfg from public.app_config;
  if p_price_cents is null or p_price_cents < v_cfg.min_fare_cents then
    raise exception 'fare_below_minimum' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.driver_locations dl where dl.driver_id = v_uid and dl.is_online
                 and dl.updated_at > now() - private.location_max_age()) then
    raise exception 'driver_offline' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.vehicles v where v.driver_id = v_uid) then
    raise exception 'driver_has_no_vehicle' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.rides a where a.driver_id = v_uid and a.status in ('assigned', 'driver_arrived', 'in_progress')) then
    raise exception 'driver_busy' using errcode = 'P0001';
  end if;

  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found or v_ride.status <> 'requested' or v_ride.expires_at <= now() then
    raise exception 'ride_not_open' using errcode = 'P0001';
  end if;
  if v_ride.passenger_id = v_uid then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_price_cents > v_ride.offered_fare_cents::bigint * 5 then
    raise exception 'fare_too_high' using errcode = 'P0001';
  end if;
  if (select count(*) from public.ride_offers o where o.ride_id = p_ride_id and o.driver_id = v_uid) >= 5 then
    raise exception 'too_many_offers' using errcode = 'P0001';
  end if;

  update public.ride_offers set status = 'withdrawn' where ride_id = p_ride_id and driver_id = v_uid and status = 'active';
  insert into public.ride_offers (ride_id, driver_id, price_cents, expires_at)
  values (p_ride_id, v_uid, p_price_cents, least(now() + make_interval(secs => v_cfg.offer_ttl_s), v_ride.expires_at))
  returning id into v_id;

  perform private.notify('rider:' || v_ride.passenger_id, 'offer_made', jsonb_build_object(
    'ride_id', p_ride_id, 'offer_id', v_id, 'driver_id', v_uid, 'price_cents', p_price_cents,
    'expires_at', least(now() + make_interval(secs => v_cfg.offer_ttl_s), v_ride.expires_at)));
  return v_id;
end $$;
revoke all on function public.make_offer(uuid, integer) from public, anon;
grant execute on function public.make_offer(uuid, integer) to authenticated;

-- B-07 ----------------------------------------------------------------------------------------------------------------
-- Devuelve el id del ride. Si falla con driver_busy, la transacción se revierte entera (no se puede persistir "oferta
-- expirada" desde un RPC que lanza): la oferta caduca por TTL y make_offer rechaza al conductor ocupado.
create function public.accept_offer(p_offer_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ride_id uuid;
  v_ride public.rides;
  v_offer public.ride_offers;
  v_vehicle uuid;
  v_other record;
begin
  if v_uid is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select o.ride_id into v_ride_id from public.ride_offers o where o.id = p_offer_id;
  if not found then
    raise exception 'offer_not_found' using errcode = 'P0001';
  end if;

  select * into v_ride from public.rides where id = v_ride_id for update; -- lock 1: ride
  if v_ride.passenger_id <> v_uid then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_ride.accepted_offer_id = p_offer_id and v_ride.status in ('assigned', 'driver_arrived', 'in_progress', 'completed') then
    return v_ride.id; -- idempotente ante reintentos (no si el viaje se canceló)
  end if;
  if v_ride.status <> 'requested' or v_ride.expires_at <= clock_timestamp() then
    raise exception 'ride_not_open' using errcode = 'P0001';
  end if;

  -- Lectura sin lock a propósito (ver cabecera): el UPDATE final con status = 'active' re-valida bajo el lock de la fila.
  select * into v_offer from public.ride_offers where id = p_offer_id;
  if v_offer.status = 'expired' or (v_offer.status = 'active' and v_offer.expires_at <= clock_timestamp()) then
    raise exception 'offer_expired' using errcode = 'P0001';
  elsif v_offer.status <> 'active' then
    raise exception 'offer_not_active' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.drivers d where d.profile_id = v_offer.driver_id and d.status = 'approved') then
    raise exception 'driver_unavailable' using errcode = 'P0001';
  end if;
  select v.id into v_vehicle from public.vehicles v where v.driver_id = v_offer.driver_id order by v.created_at desc limit 1;
  if v_vehicle is null then
    raise exception 'driver_has_no_vehicle' using errcode = 'P0001';
  end if;

  begin
    update public.rides set status = 'assigned', driver_id = v_offer.driver_id, accepted_offer_id = p_offer_id,
      vehicle_id = v_vehicle, assigned_at = now()
    where id = v_ride.id;
  exception when unique_violation then -- rides_one_active_per_driver: el conductor ya tiene otro viaje activo
    raise exception 'driver_busy' using errcode = 'P0001';
  end;

  update public.ride_offers set status = 'accepted' where id = p_offer_id and status = 'active' and expires_at > clock_timestamp();
  if not found then
    raise exception 'offer_expired' using errcode = 'P0001'; -- caducó/se retiró entre la lectura y el lock
  end if;

  for v_other in
    with u as (update public.ride_offers set status = 'rejected'
               where id in (select o.id from public.ride_offers o where o.ride_id = v_ride.id and o.status = 'active'
                            and o.id <> p_offer_id for update skip locked)
               returning driver_id, id)
    select * from u
  loop
    perform private.notify('driver:' || v_other.driver_id, 'offer_rejected', jsonb_build_object('ride_id', v_ride.id, 'offer_id', v_other.id));
  end loop;
  -- Las ofertas del conductor en otros pedidos dejan de tener sentido.
  update public.ride_offers set status = 'expired'
  where id in (select o.id from public.ride_offers o where o.driver_id = v_offer.driver_id and o.status = 'active'
               and o.ride_id <> v_ride.id for update skip locked);

  perform private.notify('driver:' || v_offer.driver_id, 'offer_accepted', jsonb_build_object(
    'ride_id', v_ride.id, 'offer_id', p_offer_id, 'price_cents', v_offer.price_cents));
  perform private.notify('rider:' || v_ride.passenger_id, 'ride_assigned', jsonb_build_object(
    'ride_id', v_ride.id, 'offer_id', p_offer_id, 'driver_id', v_offer.driver_id, 'vehicle_id', v_vehicle));
  return v_ride.id;
end $$;
revoke all on function public.accept_offer(uuid) from public, anon;
grant execute on function public.accept_offer(uuid) to authenticated;

-- B-08 ----------------------------------------------------------------------------------------------------------------
-- Máquina estricta: requested -> assigned -> driver_arrived -> in_progress -> completed.
-- Salidas: cancel_ride (solo antes de in_progress), expired (B-09).
create function public.driver_arrived(p_ride_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_ride public.rides;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then raise exception 'ride_not_found' using errcode = 'P0001'; end if;
  if v_uid is null or v_ride.driver_id is distinct from v_uid then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_ride.status <> 'assigned' then raise exception 'invalid_transition' using errcode = 'P0001'; end if;
  update public.rides set status = 'driver_arrived', driver_arrived_at = now() where id = p_ride_id;
  perform private.notify('rider:' || v_ride.passenger_id, 'driver_arrived', jsonb_build_object('ride_id', p_ride_id));
  perform private.notify('trip:' || p_ride_id, 'driver_arrived', jsonb_build_object('ride_id', p_ride_id));
end $$;

create function public.start_ride(p_ride_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_ride public.rides;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then raise exception 'ride_not_found' using errcode = 'P0001'; end if;
  if v_uid is null or v_ride.driver_id is distinct from v_uid then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_ride.status <> 'driver_arrived' then raise exception 'invalid_transition' using errcode = 'P0001'; end if;
  update public.rides set status = 'in_progress', started_at = now() where id = p_ride_id;
  perform private.notify('rider:' || v_ride.passenger_id, 'ride_started', jsonb_build_object('ride_id', p_ride_id));
  perform private.notify('trip:' || p_ride_id, 'ride_started', jsonb_build_object('ride_id', p_ride_id));
end $$;

-- final_fare_cents = precio de la oferta aceptada.
create function public.complete_ride(p_ride_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_ride public.rides; v_fare integer;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then raise exception 'ride_not_found' using errcode = 'P0001'; end if;
  if v_uid is null or v_ride.driver_id is distinct from v_uid then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_ride.status <> 'in_progress' then raise exception 'invalid_transition' using errcode = 'P0001'; end if;
  select o.price_cents into v_fare from public.ride_offers o where o.id = v_ride.accepted_offer_id;
  update public.rides set status = 'completed', completed_at = now(), final_fare_cents = v_fare where id = p_ride_id;
  perform private.notify('rider:' || v_ride.passenger_id, 'ride_completed', jsonb_build_object('ride_id', p_ride_id, 'final_fare_cents', v_fare));
  perform private.notify('trip:' || p_ride_id, 'ride_completed', jsonb_build_object('ride_id', p_ride_id, 'final_fare_cents', v_fare));
end $$;

-- Pasajero: requested/assigned/driver_arrived -> cancelled_passenger. Conductor asignado: assigned/driver_arrived -> cancelled_driver.
-- in_progress y estados terminales: invalid_transition.
create function public.cancel_ride(p_ride_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides;
  v_new public.ride_status;
  v_other record;
  v_payload jsonb;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then raise exception 'ride_not_found' using errcode = 'P0001'; end if;
  if v_uid is null or v_uid not in (v_ride.passenger_id, coalesce(v_ride.driver_id, v_ride.passenger_id)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_ride.status not in ('requested', 'assigned', 'driver_arrived') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  v_new := case when v_uid = v_ride.passenger_id then 'cancelled_passenger' else 'cancelled_driver' end;
  if char_length(p_reason) > 500 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  update public.rides set status = v_new, cancelled_at = now(), cancel_reason = p_reason where id = p_ride_id;
  v_payload := jsonb_build_object('ride_id', p_ride_id, 'status', v_new, 'reason', p_reason);

  if v_ride.status = 'requested' then -- ofertas vivas ya no tienen sentido
    for v_other in
      with u as (update public.ride_offers set status = 'expired' where ride_id = p_ride_id and status = 'active' returning driver_id)
      select * from u
    loop
      perform private.notify('driver:' || v_other.driver_id, 'ride_cancelled', v_payload);
    end loop;
  elsif v_new = 'cancelled_passenger' then
    perform private.notify('driver:' || v_ride.driver_id, 'ride_cancelled', v_payload);
  else
    perform private.notify('rider:' || v_ride.passenger_id, 'ride_cancelled', v_payload);
  end if;
  perform private.notify('trip:' || p_ride_id, 'ride_cancelled', v_payload);
end $$;

revoke all on function public.driver_arrived(uuid), public.start_ride(uuid), public.complete_ride(uuid), public.cancel_ride(uuid, text) from public, anon;
grant execute on function public.driver_arrived(uuid), public.start_ride(uuid), public.complete_ride(uuid), public.cancel_ride(uuid, text) to authenticated;

-- B-09 ----------------------------------------------------------------------------------------------------------------
-- Limpieza (no de corrección). SKIP LOCKED: nunca espera a un RPC concurrente (sin ciclos de locks); lo que quede
-- bloqueado se limpia en la siguiente pasada. No ejecutable por authenticated: lo llama pg_cron (postgres) o service_role.
-- shortcut: umbral de "ubicación vieja" fijo en 2 min; moverlo a app_config si hace falta ajustarlo.
create function public.expire_stale() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ride record;
  v_rides int := 0;
  v_offers int;
  v_drivers int;
begin
  for v_ride in
    with u as (
      update public.rides set status = 'expired'
      where id in (select r.id from public.rides r where r.status = 'requested' and r.expires_at <= now() for update skip locked)
      returning id, passenger_id)
    select * from u
  loop
    v_rides := v_rides + 1;
    perform private.notify('rider:' || v_ride.passenger_id, 'ride_expired', jsonb_build_object('ride_id', v_ride.id));
  end loop;

  update public.ride_offers set status = 'expired'
  where id in (select o.id from public.ride_offers o where o.status = 'active' and o.expires_at <= now() for update skip locked);
  get diagnostics v_offers = row_count;

  update public.driver_locations set is_online = false where is_online and updated_at < now() - interval '2 minutes';
  get diagnostics v_drivers = row_count;
  return jsonb_build_object('rides_expired', v_rides, 'offers_expired', v_offers, 'drivers_offline', v_drivers);
end $$;
revoke all on function public.expire_stale() from public, anon, authenticated;

-- pg_cron cada minuto, solo si la imagen lo ofrece (en Supabase local y hosted sí). cron.schedule con nombre es upsert.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('vyro-expire-stale', '* * * * *', 'select public.expire_stale()');
  else
    raise notice 'pg_cron no disponible: expire_stale() no está programada (la corrección no depende de ella)';
  end if;
end $$;
