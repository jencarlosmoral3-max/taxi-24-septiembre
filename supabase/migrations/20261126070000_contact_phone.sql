-- Login con Google (decisión CTO 2026-11-26): el teléfono ya no viene de auth.users (OTP desactivado).
-- Se guarda aparte, solo como dato de contacto para el viaje vivo. Sin verificar por SMS.
-- Anonimización: al borrar/anonimizar una cuenta se borra su fila de contact_phones (se hace antes de borrar el perfil: restrict).
create table private.contact_phones (
  profile_id uuid primary key references public.profiles (id) on delete restrict,
  phone text not null check (phone ~ '^591[67][0-9]{7}$'), -- celular boliviano sin '+', mismo formato de GoTrue
  updated_at timestamptz not null default now()
);

create function public.set_my_phone(p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
declare v text := regexp_replace(coalesce(p_phone, ''), '[\s-]|^\+', '', 'g');
begin
  if auth.uid() is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if v ~ '^[67][0-9]{7}$' then v := '591' || v; end if;
  if v !~ '^591[67][0-9]{7}$' then raise exception 'invalid_phone'; end if;
  insert into private.contact_phones (profile_id, phone) values (auth.uid(), v)
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

-- Misma firma, checks y errores; el teléfono sale de contact_phones (auth.users.phone solo como respaldo).
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
  return query select coalesce(cp.phone, u.phone::text), p.full_name from auth.users u
    join public.profiles p on p.id = u.id
    left join private.contact_phones cp on cp.profile_id = u.id where u.id = v_other;
end $$;
