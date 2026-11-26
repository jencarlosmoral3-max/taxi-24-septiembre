-- Vyro B-15: SOS. El cliente reintenta hasta recibir confirmación: p_client_event_id (generado una vez por pulsación) lo hace idempotente.
-- Único por (user_id, client_event_id): un id ajeno no colisiona ni revela nada.
alter table public.sos_events add column client_event_id uuid, add constraint sos_events_client_event_unique unique (user_id, client_event_id);

-- admin:sos solo para admin (se suma por OR a las políticas de B-10).
create policy realtime_messages_admin_sos on realtime.messages for select to authenticated
  using (extension = 'broadcast' and (select realtime.topic()) = 'admin:sos' and (select private.is_admin()));

-- Un SOS nunca se bloquea por datos opcionales: sin coordenadas se guarda sin ubicación; un viaje ajeno se ignora (no se revela si existe);
-- sin viaje se usa el viaje activo del usuario; al llegar al límite se devuelve el último evento existente en vez de fallar.
-- Solo coordenadas inconsistentes (una sola, o fuera de rango) o falta de id son invalid_input.
create function public.trigger_sos(p_lng double precision, p_lat double precision, p_client_event_id uuid, p_ride_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_ride uuid;
  v_loc extensions.geography;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid and p.deleted_at is null) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_client_event_id is null or (p_lng is null) <> (p_lat is null)
     or p_lng not between -180 and 180 or p_lat not between -90 and 90 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sos:' || v_uid, 0)); -- serializa reintentos y el rate limit por usuario
  select s.id into v_id from public.sos_events s where s.user_id = v_uid and s.client_event_id = p_client_event_id;
  if found then return v_id; end if; -- reintento: mismo id, sin duplicar ni volver a notificar

  if (select count(*) from public.sos_events s where s.user_id = v_uid and s.created_at > now() - interval '10 minutes') >= 5 then
    select s.id into v_id from public.sos_events s where s.user_id = v_uid order by s.created_at desc, s.id desc limit 1;
    return v_id;
  end if;

  select r.id into v_ride from public.rides r
  where v_uid in (r.passenger_id, r.driver_id)
    and (r.id = p_ride_id or (p_ride_id is null and r.status in ('assigned', 'driver_arrived', 'in_progress')))
  order by (r.id = p_ride_id) desc nulls last limit 1;
  if p_lng is not null then
    v_loc := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  end if;

  insert into public.sos_events (ride_id, user_id, location, client_event_id) values (v_ride, v_uid, v_loc, p_client_event_id)
  returning id into v_id;

  -- B-11 (push al admin) se engancha dentro de private.notify.
  perform private.notify('admin:sos', 'sos', jsonb_build_object(
    'event_id', v_id, 'user_id', v_uid, 'ride_id', v_ride, 'lat', p_lat, 'lng', p_lng));
  return v_id;
end $$;
revoke all on function public.trigger_sos(double precision, double precision, uuid, uuid) from public, anon;
grant execute on function public.trigger_sos(double precision, double precision, uuid, uuid) to authenticated;
