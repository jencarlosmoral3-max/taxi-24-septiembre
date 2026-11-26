-- Vyro B-02: grants por columna + políticas RLS (solo rol authenticated; anon no recibe nada).
-- Escrituras de rides/ofertas/ratings/sos/ubicaciones: solo vía RPC (B-05..B-15), sin grants de escritura aquí.
-- profiles no tiene INSERT: la fila la crea el trigger de B-03.

create schema private; -- fuera de PostgREST (config.schemas solo expone public/graphql_public)
grant usage on schema private to authenticated;

-- Admin SOLO por app_metadata (lo escribe el servidor); user_metadata es editable por el usuario.
create function private.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- Helpers de relación: security definer para no recursar en RLS de rides/ride_offers.
create function private.is_ride_passenger(p_ride_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rides r where r.id = p_ride_id and r.passenger_id = auth.uid())
$$;

create function private.is_ride_party(p_ride_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rides r where r.id = p_ride_id
    and (r.passenger_id = auth.uid() or r.driver_id = auth.uid()))
$$;

create function private.has_offered_on(p_ride_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ride_offers o where o.ride_id = p_ride_id and o.driver_id = auth.uid())
$$;

-- Contraparte: pasajero y conductor asignado de un mismo ride (cualquier estado, para el historial), o relación de puja
-- (uno ofertó sobre el pedido del otro) solo mientras ese pedido sigue en 'requested'.
create function private.is_counterpart(p_profile_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rides r
    where (r.passenger_id = auth.uid() and r.driver_id = p_profile_id)
       or (r.passenger_id = p_profile_id and r.driver_id = auth.uid())
       or (r.status = 'requested' and (
            (r.passenger_id = auth.uid() and exists (select 1 from public.ride_offers o where o.ride_id = r.id and o.driver_id = p_profile_id))
         or (r.passenger_id = p_profile_id and exists (select 1 from public.ride_offers o where o.ride_id = r.id and o.driver_id = auth.uid()))))
  )
$$;

create function private.is_driver() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.drivers d where d.profile_id = auth.uid() and d.status = 'approved')
$$;

grant execute on function private.is_admin(), private.is_ride_passenger(uuid), private.is_ride_party(uuid),
  private.has_offered_on(uuid), private.is_counterpart(uuid), private.is_driver() to authenticated;

-- profiles (push_token y updated_at/deleted_at fuera del select; rating_* solo lectura)
grant select (id, full_name, avatar_path, rating_avg, rating_count, created_at) on public.profiles to authenticated;
grant update (full_name, avatar_path, push_token) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or private.is_counterpart(id) or private.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- drivers (status/approved_at/rejected_reason no escribibles; license/ci no legibles)
grant select (profile_id, status, union_member_number, approved_at, rejected_reason, created_at) on public.drivers to authenticated;
grant insert (profile_id, union_member_number, license_number, ci_number) on public.drivers to authenticated;
grant update (union_member_number, license_number, ci_number) on public.drivers to authenticated;
create policy drivers_select on public.drivers for select to authenticated
  using (profile_id = auth.uid() or private.is_counterpart(profile_id) or private.is_admin());
create policy drivers_insert on public.drivers for insert to authenticated
  with check (profile_id = auth.uid());
create policy drivers_update on public.drivers for update to authenticated
  using (profile_id = auth.uid() and status in ('pending', 'rejected'))
  with check (profile_id = auth.uid());

-- vehicles (ruat/soat_expires_at no legibles por API: se exponen luego por RPC o service role)
grant select (id, driver_id, plate, brand, model, color, year) on public.vehicles to authenticated;
grant insert (driver_id, plate, brand, model, color, year, ruat, soat_expires_at) on public.vehicles to authenticated;
grant update (plate, brand, model, color, year, ruat, soat_expires_at) on public.vehicles to authenticated;
create policy vehicles_select on public.vehicles for select to authenticated
  using (driver_id = auth.uid() or private.is_counterpart(driver_id) or private.is_admin());
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (driver_id = auth.uid()
    and exists (select 1 from public.drivers d where d.profile_id = auth.uid() and d.status in ('pending', 'rejected')));
create policy vehicles_update on public.vehicles for update to authenticated
  using (driver_id = auth.uid()
    and exists (select 1 from public.drivers d where d.profile_id = auth.uid() and d.status in ('pending', 'rejected')))
  with check (driver_id = auth.uid());

-- driver_documents
grant select (id, driver_id, type, status, reason, created_at, storage_path) on public.driver_documents to authenticated;
grant insert (driver_id, type, storage_path) on public.driver_documents to authenticated;
create policy driver_documents_select on public.driver_documents for select to authenticated
  using (driver_id = auth.uid() or private.is_admin());
create policy driver_documents_insert on public.driver_documents for insert to authenticated
  with check (driver_id = auth.uid() and storage_path like auth.uid()::text || '/%');

-- driver_locations: lectura solo dueño/admin; escritura por RPC (B-10)
grant select (driver_id, location, heading, is_online, updated_at) on public.driver_locations to authenticated;
create policy driver_locations_select on public.driver_locations for select to authenticated
  using (driver_id = auth.uid() or private.is_admin());

-- rides / ride_offers / ride_track_points / ratings / sos_events: solo lectura; escritura por RPC
grant select on public.rides to authenticated;
create policy rides_select on public.rides for select to authenticated
  using (passenger_id = auth.uid() or driver_id = auth.uid() or (private.has_offered_on(id) and status = 'requested') or private.is_admin());

grant select on public.ride_offers to authenticated;
create policy ride_offers_select on public.ride_offers for select to authenticated
  using (driver_id = auth.uid() or private.is_ride_passenger(ride_id) or private.is_admin());

grant select on public.ride_track_points to authenticated;
create policy ride_track_points_select on public.ride_track_points for select to authenticated
  using (private.is_ride_party(ride_id) or private.is_admin());

grant select (id, ride_id, stars, comment, created_at, rater_id, ratee_id) on public.ratings to authenticated;
create policy ratings_select on public.ratings for select to authenticated
  using (rater_id = auth.uid() or ratee_id = auth.uid() or private.is_admin());

grant select on public.sos_events to authenticated;
create policy sos_events_select on public.sos_events for select to authenticated
  using (user_id = auth.uid() or private.is_admin());

-- app_config: lectura para todos los autenticados, escritura solo admin con auditoría
grant select on public.app_config to authenticated;
grant update (min_fare_cents, search_radius_m, offer_ttl_s, ride_ttl_s, base_cents, per_km_cents, per_min_cents)
  on public.app_config to authenticated;
create policy app_config_select on public.app_config for select to authenticated using (true);
create policy app_config_update on public.app_config for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

grant select on public.config_audit to authenticated;
create policy config_audit_select on public.config_audit for select to authenticated using (private.is_admin());

create function private.audit_app_config() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.config_audit (changed_by, old, new) values (auth.uid(), to_jsonb(old), to_jsonb(new));
  return null;
end $$;
create trigger app_config_audit after update on public.app_config
  for each row execute function private.audit_app_config();

-- Contacto de la contraparte: solo en viaje vivo y solo para sus dos partes.
create function public.get_ride_contact(p_ride_id uuid) returns table (phone text, full_name text)
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
  return query select u.phone::text, p.full_name from auth.users u
    join public.profiles p on p.id = u.id where u.id = v_other;
end $$;
revoke all on function public.get_ride_contact(uuid) from public, anon;
grant execute on function public.get_ride_contact(uuid) to authenticated;
