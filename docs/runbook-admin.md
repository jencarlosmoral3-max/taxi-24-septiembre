# Runbook: otorgar rol admin

El rol admin se lee de `app_metadata.role` del JWT (`private.is_admin()`). Nunca de `user_metadata`, que el usuario puede editar.

1. La persona inicia sesión una vez con su número (+591...) para que exista en `auth.users`.
2. Con service role (SQL Editor del proyecto o conexión directa), ejecutar:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where phone = '+591XXXXXXXX';
```

3. La persona debe cerrar sesión y volver a entrar: el claim viaja en el JWT y el token vigente no cambia hasta renovarse (`jwt_expiry` 3600 s).
4. Quitar el rol: `raw_app_meta_data = raw_app_meta_data - 'role'` y esperar a que venza el token.

No dar admin por la API cliente ni por `user_metadata`. Registrar quién lo otorgó y cuándo en el handoff.
