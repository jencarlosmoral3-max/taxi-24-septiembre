-- Login con Google (decisión CTO 2026-11-26): el teléfono ya no viene de auth.users (OTP desactivado).
-- Se guarda aparte, solo como dato de contacto para el viaje vivo. Sin verificar por SMS.
-- Anonimización: al borrar/anonimizar una cuenta se borra su fila de contact_phones (se hace antes de borrar el perfil: restrict).
create table private.contact_phones (
  profile_id uuid primary key references public.profiles (id) on delete restrict,
  phone text not null check (phone ~ '^591[67][0-9]{7}$'), -- celular boliviano sin '+', mismo formato de GoTrue
  updated_at timestamptz not null default now()
);
-- Defensa en profundidad: sin políticas, solo roles con bypass (postgres, service_role) leen o escriben.
alter table private.contact_phones enable row level security;
-- service_role: lo necesitarán admin y SOS (RPC de admin para cambiar el teléfono de un conductor aprobado).
grant usage on schema private to service_role;
grant select, insert, update, delete on private.contact_phones to service_role;

comment on table public.profiles is 'Perfil de cada usuario (id = auth.users.id). deleted_at marca cuentas anonimizadas.
Anonimizar = auth.users se conserva (phone null + ban) y aquí se nulifican full_name, avatar_path y push_token; las FKs son restrict, nunca se borra.
El teléfono de contacto vive en private.contact_phones (no en auth.users: el login es con Google) y se borra al anonimizar.';

create function public.set_my_phone(p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v text := regexp_replace(btrim(coalesce(p_phone, '')), '[\s-]|^\+', '', 'g');
begin
  if v_uid is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles p where p.id = v_uid and p.deleted_at is not null) then
    raise exception 'account_deleted' using errcode = 'P0001';
  end if;
  if v ~ '^[67][0-9]{7}$' then v := '591' || v; end if;
  if v !~ '^591[67][0-9]{7}$' then raise exception 'invalid_phone' using errcode = 'P0001'; end if;
  -- Conductor aprobado: el teléfono queda fijo (lo cambia un admin por RPC, fuera de alcance).
  if exists (select 1 from public.drivers d where d.profile_id = v_uid and d.status = 'approved') then
    raise exception 'phone_locked' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.rides r where v_uid in (r.passenger_id, r.driver_id)
             and r.status in ('assigned', 'driver_arrived', 'in_progress')) then
    raise exception 'phone_locked_active_ride' using errcode = 'P0001';
  end if;
  insert into private.contact_phones (profile_id, phone) values (v_uid, v)
    on conflict (profile_id) do update set phone = excluded.phone, updated_at = now();
end $$;
revoke all on function public.set_my_phone(text) from public, anon;
grant execute on function public.set_my_phone(text) to authenticated;

create function public.get_my_phone() returns text
language sql stable security definer set search_path = '' as $$
  select phone from private.contact_phones where profile_id = auth.uid()
$$;
revoke all on function public.get_my_phone() from public, anon;
grant execute on function public.get_my_phone() to authenticated;

-- Misma firma, checks y errores; el teléfono sale solo de contact_phones.
create or replace function public.get_ride_contact(p_ride_id uuid) returns table (phone text, full_name text)
language plpgsql stable security definer set search_path = '' as $$
declare v_other uuid;
begin
  select case when r.passenger_id = auth.uid() then r.driver_id else r.passenger_id end into v_other
  from public.rides r
  where r.id = p_ride_id and r.status in ('assigned', 'driver_arrived', 'in_progress')
    and auth.uid() in (r.passenger_id, r.driver_id);
  if v_other is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select cp.phone, p.full_name from public.profiles p
    left join private.contact_phones cp on cp.profile_id = p.id where p.id = v_other;
end $$;

-- create_ride y make_offer: copia de 20261126060000 más el chequeo phone_required (grants se conservan).
create or replace function public.create_ride(
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
  if not exists (select 1 from private.contact_phones where profile_id = v_uid) then
    raise exception 'phone_required' using errcode = 'P0001';
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

create or replace function public.make_offer(p_ride_id uuid, p_price_cents integer) returns uuid
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
  if not exists (select 1 from private.contact_phones where profile_id = v_uid) then
    raise exception 'phone_required' using errcode = 'P0001';
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
