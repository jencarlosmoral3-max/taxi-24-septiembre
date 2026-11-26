begin;
select plan(6);

insert into auth.users (id, instance_id, aud, role, phone) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+59170000001');

select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 1, 'insertar en auth.users crea el perfil');
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), null, 'el perfil nace vacío');
select hasnt_column('public', 'profiles', 'phone', 'profiles no guarda el teléfono');
select has_function('private', 'handle_new_user', 'existe private.handle_new_user');

create function pg_temp.login(app jsonb, usr jsonb) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated',
    'app_metadata', app, 'user_metadata', usr)::text, true);
end $$;

select pg_temp.login('{}', '{"role":"admin"}');
select ok(not private.is_admin(), 'user_metadata role=admin no da admin');
select pg_temp.login('{"role":"admin"}', '{}');
select ok(private.is_admin(), 'app_metadata role=admin da admin');

select * from finish();
rollback;
