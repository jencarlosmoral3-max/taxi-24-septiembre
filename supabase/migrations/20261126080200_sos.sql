-- Vyro B-15: SOS. El cliente reintenta hasta recibir confirmación: p_client_event_id (generado una vez por pulsación) lo hace idempotente.
-- Único por (user_id, client_event_id): un id ajeno no colisiona ni revela nada.
alter table public.sos_events add column client_event_id uuid, add constraint sos_events_client_event_unique unique (user_id, client_event_id);

-- admin:sos solo para admin (se suma por OR a las políticas de B-10).
create policy realtime_messages_admin_sos on realtime.messages for select to authenticated
  using (extension = 'broadcast' and (select realtime.topic()) = 'admin:sos' and (select private.is_admin()));

create function public.trigger_sos(p_lng double precision, p_lat double precision, p_client_event_id uuid, p_ride_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid and p.deleted_at is null) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_client_event_id is null or p_lng is null or p_lat is null or p_lng not between -180 and 180 or p_lat not between -90 and 90 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sos:' || v_uid, 0)); -- serializa reintentos y el rate limit por usuario
  select s.id into v_id from public.sos_events s where s.user_id = v_uid and s.client_event_id = p_client_event_id;
  if found then return v_id; end if; -- reintento: mismo id, sin duplicar ni volver a notificar

  if p_ride_id is not null and not exists (
    select 1 from public.rides r where r.id = p_ride_id and v_uid in (r.passenger_id, r.driver_id)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.sos_events s where s.user_id = v_uid and s.created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.sos_events (ride_id, user_id, location, client_event_id)
  values (p_ride_id, v_uid, extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography, p_client_event_id)
  returning id into v_id;

  -- B-11 (push al admin) se engancha dentro de private.notify.
  perform private.notify('admin:sos', 'sos', jsonb_build_object(
    'event_id', v_id, 'user_id', v_uid, 'ride_id', p_ride_id, 'lat', p_lat, 'lng', p_lng));
  return v_id;
end $$;
revoke all on function public.trigger_sos(double precision, double precision, uuid, uuid) from public, anon;
grant execute on function public.trigger_sos(double precision, double precision, uuid, uuid) to authenticated;
