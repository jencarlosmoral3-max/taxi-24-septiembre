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

-- Helpers de relación: conjuntos (setof uuid) evaluados UNA vez por consulta con `x in (select private.f())`.
-- security definer para no recursar en las políticas de rides/ride_offers; auth.uid() siempre envuelto en (select ...).
create function private.my_party_ride_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select r.id from public.rides r where r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid())
$$;

create function private.my_passenger_ride_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select r.id from public.rides r where r.passenger_id = (select auth.uid())
$$;

-- Pedidos abiertos donde el conductor tiene oferta viva (active/expired; una rechazada/retirada ya no da acceso).
create function private.my_bidding_ride_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select o.ride_id from public.ride_offers o join public.rides r on r.id = o.ride_id
  where o.driver_id = (select auth.uid()) and r.status = 'requested' and o.status in ('active', 'expired')
$$;

-- Contraparte: pasajero y conductor asignado de un mismo ride (cualquier estado, historial), o relación de puja
-- (oferta active/expired) solo mientras el pedido sigue en 'requested'.
create function private.counterpart_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select r.driver_id from public.rides r where r.passenger_id = (select auth.uid()) and r.driver_id is not null
  union
  select r.passenger_id from public.rides r where r.driver_id = (select auth.uid())
  union
  select o.driver_id from public.ride_offers o join public.rides r on r.id = o.ride_id
    where r.passenger_id = (select auth.uid()) and r.status = 'requested' and o.status in ('active', 'expired')
  union
  select r.passenger_id from public.rides r where r.id in (select private.my_bidding_ride_ids())
$$;

create function private.vehicle_in_use(p_vehicle_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rides r where r.vehicle_id = p_vehicle_id)
$$;

-- definer: contar vehículos desde la política de vehicles sin recursión de RLS.
create function private.my_vehicle_count() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.vehicles v where v.driver_id = (select auth.uid())
$$;

grant execute on function private.my_vehicle_count(), private.is_admin(), private.my_party_ride_ids(), private.my_passenger_ride_ids(),
  private.my_bidding_ride_ids(), private.counterpart_ids(), private.vehicle_in_use(uuid) to authenticated;

-- profiles (push_token y updated_at/deleted_at fuera del select; rating_* solo lectura)
grant select (id, full_name, avatar_path, rating_avg, rating_count, created_at) on public.profiles to authenticated;
grant update (full_name, avatar_path, push_token) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or id in (select private.counterpart_ids()) or (select private.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- drivers: status/approved_at/rejected_reason no escribibles; license/ci/rejected_reason no legibles por API
-- (el dueño lee su motivo de rechazo con get_my_driver_application()).
-- Altera B-01: el número de socio deja de ser único global (permitía "squatting" de un número ajeno en pending);
-- ahora es único solo entre conductores aprobados.
alter table public.drivers drop constraint drivers_union_member_number_key;
create unique index drivers_union_member_number_approved on public.drivers (union_member_number) where status = 'approved';

grant select (profile_id, status, union_member_number, approved_at, created_at) on public.drivers to authenticated;
grant insert (profile_id, union_member_number, license_number, ci_number) on public.drivers to authenticated;
grant update (union_member_number, license_number, ci_number) on public.drivers to authenticated;
create policy drivers_select on public.drivers for select to authenticated
  using (profile_id = (select auth.uid()) or profile_id in (select private.counterpart_ids()) or (select private.is_admin()));
create policy drivers_insert on public.drivers for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy drivers_update on public.drivers for update to authenticated
  using (profile_id = (select auth.uid()) and status in ('pending', 'rejected'))
  with check (profile_id = (select auth.uid()));

create function public.get_my_driver_application()
returns table (status public.driver_status, rejected_reason text, approved_at timestamptz, union_member_number text)
language sql stable security definer set search_path = '' as $$
  select d.status, d.rejected_reason, d.approved_at, d.union_member_number
  from public.drivers d where d.profile_id = (select auth.uid())
$$;
revoke all on function public.get_my_driver_application() from public, anon;
grant execute on function public.get_my_driver_application() to authenticated;

-- vehicles (ruat/soat_expires_at no legibles por API: se exponen luego por RPC o service role).
-- Tope de 2 vehículos por conductor; la placa sigue siendo única (el squatting queda acotado a 2: el arreglo real es la revisión admin).
grant select (id, driver_id, plate, brand, model, color, year) on public.vehicles to authenticated;
grant insert (driver_id, plate, brand, model, color, year, ruat, soat_expires_at) on public.vehicles to authenticated;
grant update (plate, brand, model, color, year, ruat, soat_expires_at) on public.vehicles to authenticated;
create policy vehicles_select on public.vehicles for select to authenticated
  using (driver_id = (select auth.uid()) or driver_id in (select private.counterpart_ids()) or (select private.is_admin()));
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (driver_id = (select auth.uid())
    and exists (select 1 from public.drivers d where d.profile_id = (select auth.uid()) and d.status in ('pending', 'rejected'))
    and (select private.my_vehicle_count()) < 2);
create policy vehicles_update on public.vehicles for update to authenticated
  using (driver_id = (select auth.uid())
    and exists (select 1 from public.drivers d where d.profile_id = (select auth.uid()) and d.status in ('pending', 'rejected'))
    and not private.vehicle_in_use(id))
  with check (driver_id = (select auth.uid()));

-- driver_documents (reviewed_by/reviewed_at fuera del select)
grant select (id, driver_id, type, status, reason, created_at, storage_path) on public.driver_documents to authenticated;
grant insert (driver_id, type, storage_path) on public.driver_documents to authenticated;
create policy driver_documents_select on public.driver_documents for select to authenticated
  using (driver_id = (select auth.uid()) or (select private.is_admin()));
create policy driver_documents_insert on public.driver_documents for insert to authenticated
  with check (driver_id = (select auth.uid())
    and storage_path ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|pdf)$'));

-- driver_locations: lectura solo dueño/admin; escritura por RPC (B-10)
grant select (driver_id, location, heading, is_online, updated_at) on public.driver_locations to authenticated;
create policy driver_locations_select on public.driver_locations for select to authenticated
  using (driver_id = (select auth.uid()) or (select private.is_admin()));

-- rides / ride_offers / ride_track_points / ratings / sos_events: solo lectura (columnas explícitas); escritura por RPC
grant select (id, passenger_id, driver_id, vehicle_id, accepted_offer_id, origin, destination, origin_text, destination_text,
  offered_fare_cents, final_fare_cents, passenger_count, comment, status, expires_at, assigned_at, driver_arrived_at,
  started_at, completed_at, cancelled_at, cancel_reason, created_at) on public.rides to authenticated;
create policy rides_select on public.rides for select to authenticated
  using (passenger_id = (select auth.uid()) or driver_id = (select auth.uid())
    or id in (select private.my_bidding_ride_ids()) or (select private.is_admin()));

grant select (id, ride_id, driver_id, price_cents, status, expires_at, created_at) on public.ride_offers to authenticated;
create policy ride_offers_select on public.ride_offers for select to authenticated
  using (driver_id = (select auth.uid()) or ride_id in (select private.my_passenger_ride_ids()) or (select private.is_admin()));

grant select (ride_id, recorded_at, location) on public.ride_track_points to authenticated;
create policy ride_track_points_select on public.ride_track_points for select to authenticated
  using (ride_id in (select private.my_party_ride_ids()) or (select private.is_admin()));

grant select (id, ride_id, stars, comment, created_at, rater_id, ratee_id) on public.ratings to authenticated;
create policy ratings_select on public.ratings for select to authenticated
  using (rater_id = (select auth.uid()) or ratee_id = (select auth.uid()) or (select private.is_admin()));

grant select (id, ride_id, user_id, location, created_at, handled_at) on public.sos_events to authenticated; -- sin handled_by
create policy sos_events_select on public.sos_events for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- app_config: lectura para todos los autenticados, escritura solo admin con auditoría
grant select (id, min_fare_cents, search_radius_m, offer_ttl_s, ride_ttl_s, base_cents, per_km_cents, per_min_cents, updated_at)
  on public.app_config to authenticated;
grant update (min_fare_cents, search_radius_m, offer_ttl_s, ride_ttl_s, base_cents, per_km_cents, per_min_cents)
  on public.app_config to authenticated;
create policy app_config_select on public.app_config for select to authenticated using (true);
create policy app_config_update on public.app_config for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

grant select (id, changed_by, changed_at, old, new) on public.config_audit to authenticated;
create policy config_audit_select on public.config_audit for select to authenticated using ((select private.is_admin()));

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
