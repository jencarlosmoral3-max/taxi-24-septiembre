# Runbook: otorgar y quitar el rol admin

El rol admin se lee de `app_metadata.role` del JWT (`private.is_admin()`). Nunca de `user_metadata`, que el usuario puede editar.
El login es con Google: la cuenta se identifica por **email** (Google lo entrega verificado). `auth.users.phone` queda vacío.

## Otorgar
1. La persona inicia sesión una vez con su cuenta Google para que exista en `auth.users`.
2. Con service role (SQL Editor del proyecto o conexión directa):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
where email = 'persona@gmail.com';
```

   Debe imprimir `UPDATE 1`. `UPDATE 0` = email mal escrito; no se otorgó nada.
   Alternativa desde un script con service role: `auth.admin.updateUserById(id, { app_metadata: { role: 'admin' } })`.
3. La persona renueva la sesión (`refreshSession()` o volver a entrar): el claim viaja en el JWT.

## Quitar
```sql
update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where email = 'persona@gmail.com';
delete from auth.sessions where user_id = (select id from auth.users where email = 'persona@gmail.com');
```
El `update` debe imprimir `UPDATE 1`; si imprime `UPDATE 0`, el rol **no** se quitó. Borrar las sesiones corta el refresh, pero el access token vigente sigue siendo admin hasta que vence (`jwt_expiry`, 3600 s en local; revisar el valor del proyecto remoto). Si esa ventana no es aceptable, `is_admin()` debe consultar la DB (pendiente A-01, junto con MFA).

## No hacer
- No dar admin por la API cliente ni por `user_metadata`.
- No borrar usuarios de `auth.users` (dashboard o `admin.deleteUser`): falla con "Database error deleting user" porque `profiles` y los viajes referencian al usuario con `on delete restrict`. Es a propósito: las cuentas se anonimizan, no se borran. No "arreglarlo" quitando la FK.
- No correr `supabase config push` con `supabase/config.jsonc` tal cual: tiene `skip_nonce_check: true`, válido solo en local. En el proyecto remoto "Skip nonce checks" va apagado y la app manda nonce.

Registrar quién otorgó o quitó el rol y cuándo en `docs/decisiones.md`.
