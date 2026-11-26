-- Vyro B-03: todo usuario de auth.users (pasajeros, conductores, admins) recibe su fila en public.profiles.
-- profiles no tiene INSERT para la API (B-02); solo este trigger la crea. El teléfono vive únicamente en auth.users.

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Usuarios previos sin perfil.
insert into public.profiles (id) select u.id from auth.users u on conflict (id) do nothing;
