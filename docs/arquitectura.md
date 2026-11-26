# Arquitectura de software — Vyro (app del Sindicato 24 de Septiembre)

Estado: aprobada (plan del CTO 2026-11-25) y validada por council `council-20261126-015521` (Claude + Gemini a favor de la opción A con ajustes; Codex sin opinión por error). Confianza: media (2 de 3 voces).

## Resumen
| Capa | Elección |
|---|---|
| App móvil (pasajero + conductor) | Expo (SDK actual) + Expo Router + TypeScript · EAS Build/Update |
| Mapas | MVP: `@maplibre/maplibre-react-native` + tiles de OpenFreeMap con estilo oscuro (sin tarjeta). Piloto: evaluar Google |
| Ubicación conductor | `expo-location` + `expo-task-manager` con foreground service (go/no-go en spike F-06; plan B Transistorsoft con licencia propia) |
| Estado cliente | TanStack Query (servidor) + Zustand (UI/sesión) |
| Backend | Supabase `sa-east-1`: Postgres + PostGIS, Auth (Google), Realtime Broadcast, Storage, Edge Functions, pg_cron |
| Login | Google (Supabase Auth, `signInWithIdToken` nativo). Teléfono de contacto declarado por el usuario, sin verificar en el piloto; OTP por WhatsApp/SMS queda para después del piloto |
| Push | FCM vía Expo Notifications, alta prioridad para pedidos y ofertas |
| Geocoding / rutas | Edge Function proxy. MVP: Geoapify (búsqueda, reverse, distancia/duración), plan gratis; Photon/Nominatim públicos bloquean las IPs de Supabase Edge (403, logs 2026-11-26), el CTO eligió Geoapify. Piloto: Google Places + Routes (key nunca en la app) |
| Panel sindicato | Next.js (App Router) en Vercel, mismo Supabase, claim `admin` |
| Monitoreo | Sentry (app + admin) |
| Repo | Monorepo pnpm: `apps/mobile`, `apps/admin`, `supabase/` (migrations, functions, tests pgTAP) |

Descartadas: stack QUIVO (NestJS + Redis + websockets propios: más operación para un equipo chico, el CTO eligió app independiente) y Firebase (sin geoespacial nativo, cobro por lectura con GPS).

## Modelo de datos
- `profiles` (id = auth.uid, nombre, foto, rating_avg, push_token). El teléfono de contacto vive en `private.contact_phones` (fuera de la API); el de la contraparte se entrega por RPC desde `assigned`. Admin = claim del JWT; conductor = tiene fila en `drivers` (sin columna `role`).
- `drivers` (profile_id, estado `pending|approved|suspended`, nº interno, licencia, CI)
- `vehicles` (driver_id, placa, marca, modelo, color, año, RUAT, SOAT)
- `driver_documents` (driver_id, tipo, storage_path, estado)
- `driver_locations` (**una fila por conductor**: geography Point, heading, `is_online`, `updated_at`) — índice GIST
- `rides` (pasajero, conductor, `accepted_offer_id`, `vehicle_id`, origen/destino geography + texto, `offered_fare_cents`, `final_fare_cents`, estado, `expires_at`, timestamps por estado, motivo de cancelación). Checks de coherencia estado ↔ conductor/oferta en la DB.
- `ride_offers` (ride_id, driver_id, precio, estado `active|accepted|rejected|expired`, `expires_at`)
- `ride_track_points` (solo durante viajes en curso, insert por lotes)
- `ratings`, `sos_events`, `app_config` (tarifa mínima, radio, tiempos de expiración, fórmula de tarifa sugerida), `config_audit`

### Invariantes en la DB (B-01)
- Índices únicos parciales: 1 viaje abierto por pasajero (`requested` a `in_progress`), 1 viaje activo por conductor, 1 oferta activa por conductor y pedido, 1 oferta aceptada por pedido.
- Trigger en `ride_offers`: no se insertan ofertas sobre un pedido que no está `requested` y vigente (`FOR SHARE`, serializa con el `FOR UPDATE` de `accept_offer`).
- Privilegios: `anon` y `authenticated` sin ningún permiso por defecto en `public` (tablas, secuencias, funciones, también las futuras). Cada grant es explícito, por columna o por función, desde B-02.
- Borrado: nunca se borra `auth.users`. Eliminar cuenta = anonimizar (borrar el teléfono de contacto + ban, PII nula en nuestras tablas). FKs con `on delete restrict` para no perder auditoría.
- `driver_locations`: fillfactor 50 y autovacuum agresivo; GIST parcial `where is_online`. En B-17 se mide contra quitar el índice (updates HOT con seq scan).

## Máquina de estados de `rides`
`requested → assigned → driver_arrived → in_progress → completed`
Salidas: `cancelled_passenger`, `cancelled_driver`, `expired`. Cada transición es un RPC que valida estado actual y actor.

## Puja (núcleo)
1. **`create_ride`**: valida tarifa ≥ mínimo; índice único parcial "1 pedido abierto por pasajero"; inserta con `expires_at`; busca conductores `approved`, `is_online`, libres y con ubicación < 60 s dentro del radio (`ST_DWithin`); les envía `realtime.send` a `driver:{id}` y push FCM de alta prioridad.
2. **`make_offer`**: una oferta activa por conductor y viaje (la nueva reemplaza a la anterior), `expires_at` ~45 s, conductor sin viaje activo; notifica a `rider:{id}` + push.
3. **`accept_offer`**: `SELECT … FOR UPDATE` sobre el ride; valida `status='requested' AND expires_at > now()` y oferta vigente; asigna; rechaza el resto; índice único parcial "1 viaje activo por conductor" impide la doble asignación. Idempotente ante reintentos.
4. **Expiración**: `expires_at` se valida en cada RPC (corrección). `pg_cron` cada 30–60 s solo limpia estados y avisa.
5. **Fuente de verdad = base de datos.** Realtime y push son caminos rápidos; al abrir o reconectar, la app reconcilia el estado consultando el ride.

## Tiempo real y GPS
- **No se usa `postgres_changes`** (evalúa RLS por suscriptor y por cambio y no escala). Solo **Broadcast privado** con políticas sobre `realtime.messages` (se evalúan al unirse al canal).
- Canales: `driver:{id}`, `rider:{id}` (notificaciones de la puja) y `trip:{id}` (posición en vivo del conductor asignado, un único suscriptor).
- **GPS de la flota:** RPC `upsert_driver_location` sobre la fila del conductor, con envío adaptativo (5 s en movimiento, 10–15 s detenido). Con ~400 conductores son ~50–100 escrituras/s, manejable; ajustar autovacuum en `driver_locations` (no hay HOT update al tocar columna indexada). No se usa Realtime para la flota.
- Historial GPS solo durante viajes, en lotes (`ride_track_points`).
- Palanca de escala (si se pasa de ~2.000 conductores en línea): ubicaciones en Redis (`GEOADD`/`GEOSEARCH`).

## Seguridad y privacidad
- Realtime: solo Broadcast privado; los clientes solo leen (políticas sobre `realtime.messages` por tópico exacto). Todo evento, incluida la posición en vivo del viaje, lo emite el servidor.
- RLS en el 100% de las tablas; lógica sensible solo en RPC `security definer` con `search_path` fijo.
- Teléfono y ubicación de la contraparte visibles solo desde `assigned` hasta cerrar el viaje.
- Bucket privado `driver-docs`: dueño escribe y lee lo suyo; admin lee con URLs firmadas cortas.
- Rate limit en el proxy de Places/Routes y en `create_ride`. Login con Google: el ID token se valida con nonce en producción ("Skip nonce checks" apagado en el proyecto remoto).
- SOS: RPC con reintento en el cliente hasta recibir confirmación + Broadcast y push al admin. No depende del WebSocket.
- Eliminar cuenta: anonimizar datos personales y conservar viajes para auditoría del sindicato.

## Costos (a aprobar en F-02)
Google Places/Routes (ruta calculada una vez por pedido, autocomplete con session token y debounce) · Supabase Pro US$25/mes al piloto · Google Play US$25 · Apple US$99/año (V2). Maps SDK Android: sin costo por carga.

## Calidad
- pgTAP para RPCs de puja, transiciones y RLS (incluye test de concurrencia de `accept_offer`).
- CI: `tsc`, lint, `supabase test db`, build admin; checks requeridos en `main`.
- Prueba de carga antes del piloto: 500 conductores simulados con GPS + 50 pujas simultáneas contra staging.

## Riesgos
1. **Android gama baja** mata servicios y WebSockets en segundo plano (Xiaomi, Tecno, Samsung). Mitigación: foreground service, push FCM de alta prioridad, reconciliación; spike F-06 temprano.
2. **Teléfono sin verificar** (login con Google): cualquiera puede declarar un número falso. Mitigación: hace falta teléfono para pedir u ofertar; no se puede cambiar con un viaje activo; el de un conductor aprobado queda bloqueado (lo cambia el admin, que lo valida al aprobar). Pasajeros sin validar en el piloto; verificación por WhatsApp después si hay abuso.
3. **Calidad de direcciones en Santa Cruz**: Google Places + "fijar en mapa".
4. **Lógica en PL/pgSQL** es más difícil de depurar: cobertura pgTAP obligatoria en CI.
5. **Dependencia de Supabase** (cuotas, incidentes): datos y lógica son Postgres estándar; Auth y Realtime serían lo que habría que reemplazar.
