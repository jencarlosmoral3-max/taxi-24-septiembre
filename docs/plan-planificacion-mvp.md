# Plan — App taxis estilo inDrive · Sindicato 24 de Septiembre (Santa Cruz)

## Context
CTO pide app de taxis tipo inDrive para el Sindicato 24 de Septiembre. Entrega de esta iteración: **planificación completa** — dirección de arte, diseño (pantallas/flujos), arquitectura de software y backlog entero en Linear (team `IND` "Indrive para 24 de septiembre", hoy vacío).
Decisiones del CTO (2026-11-25): app **independiente** de QUIVO · **Figma primero** · precio por **puja tipo inDrive** · **solo efectivo** en MVP.

Insumos Figma revisados (solo lectura):
- `RideNow` (p5Mf…): mockups **rasterizados** (no capas). Flujos pasajero+conductor: splash, onboarding x3, OTP, home mapa + "Find a driver" con tarifa ofrecida, pago, programar, chat, conductor en camino, cancelar; conductor: online/offline, lista de solicitudes con Aceptar/Rechazar, documentos 4 pasos, ganancias, historial, perfil, soporte.
- `Uber kit` (bqOL…): solo onboarding son frames reales (teléfono → datos → OTP → password → home). Get a ride / Payment / Profile son imágenes.
- No se copian assets ni marca de esos archivos: solo referencia de flujo y paleta.

## Dirección de arte (→ `docs/arte.md` + doc Linear)
- Concepto: "taxi del sindicato, confiable y local". Oscuro + amarillo taxi; guiño cruceño con verde.
- Paleta (muestreada del Figma RideNow + ajuste):
  - `bg #191919` · `surface #242424` · `surface-2 #2E2E2E` · `border #3A3A3A`
  - `primary #F6C200` (amarillo taxi, CTA) · `on-primary #191919`
  - `danger #FF3B30` (rechazar/cancelar/SOS) · `success #1FA05A` (verde Santa Cruz: online, aceptado)
  - `text #FFFFFF` · `text-muted #A6A6A6`
- Tipografía: Poppins (600 títulos / 400–500 cuerpo), igual que la referencia.
- Forma: radios 16 (cards) / pill (botones), botones CTA full-width 56 px, targets ≥48 px (conductores manejando).
- Iconos: set lineal único (Lucide/Phosphor vía Iconify). Ilustraciones propias (taxi amarillo, Cristo Redentor/catedral de Santa Cruz) generadas, no las de Storyset del archivo.
- Mapa: estilo oscuro Google Maps custom JSON acorde a la paleta.
- Solo modo oscuro en MVP; contraste AA verificado (sol directo es el caso duro).
- Pendiente del sindicato: nombre comercial y logo (placeholder "Taxi 24").

## Diseño — inventario de pantallas (→ `docs/pantallas.md`)
Una sola app con modo Pasajero/Conductor (como inDrive); conductor habilitado solo tras aprobación.
- **Común (8):** splash, onboarding x3, login teléfono, OTP, registro nombre+foto, permiso ubicación, perfil/ajustes, soporte/FAQ, historial.
- **Pasajero (10):** home mapa + "¿A dónde vas?" · buscar destino (autocomplete, guardados, fijar en mapa) · ofrecer tarifa (sugerida + mínimo sindicato, nº pasajeros, comentario) · esperando ofertas (subir tarifa, cancelar) · lista ofertas (conductor, auto, placa, nº interno, rating, ETA, precio; aceptar/rechazar) · conductor en camino (mapa vivo, llamar, cancelar con motivo) · viaje en curso + SOS · llegada: pagar efectivo + calificar · cancelación · detalle de viaje.
- **Conductor (10):** registro conductor 4 pasos (datos+nº interno, licencia+CI, vehículo RUAT/SOAT, fotos) · pendiente aprobación · home online/offline · solicitudes entrantes (aceptar precio / contraoferta +Bs / ignorar) · esperando respuesta · ir a recoger (deep link Google Maps/Waze) · llegué / iniciar · en viaje · finalizar + cobro efectivo + calificar pasajero · ganancias (día/semana).
- **Admin web sindicato (6):** login · solicitudes de conductores (ver docs, aprobar/rechazar) · padrón (suspender) · viajes en vivo/historial · SOS/incidencias · configuración (tarifa mínima, radio, expiración de ofertas).

## Arquitectura (→ `docs/arquitectura.md` + doc Linear)
Recomendación del chairman (lean, equipo chico, realtime es el núcleo):
- **Mobile:** Expo (SDK actual) + Expo Router + TypeScript, EAS Build/Update. Mapas `react-native-maps` (Google en Android, SDK de mapas móvil sin costo por carga). Ubicación conductor: `expo-location` + `expo-task-manager` con foreground service mientras está "En línea". TanStack Query + Zustand. Push: Expo Notifications.
- **Backend:** Supabase región `sa-east-1` — Postgres + PostGIS, Auth por teléfono (OTP SMS vía Twilio Verify), Realtime (broadcast privado por usuario + postgres_changes), Storage privado para documentos, Edge Functions (Places/Routes proxy, push). Lógica crítica en funciones SQL `security definer` + RLS en todas las tablas.
- **Admin:** Next.js (App Router) en Vercel, mismo Supabase, rol `admin` por claim.
- **Repo:** monorepo pnpm `taxi-24-septiembre/` → `apps/mobile`, `apps/admin`, `supabase/` (migrations, functions, tests pgTAP), tipos con `supabase gen types`.
- **Modelo de datos:** `profiles`, `drivers` (estado pending/approved/suspended, nº interno), `vehicles`, `driver_documents`, `driver_locations` (geography, is_online, updated_at), `rides`, `ride_offers`, `ratings`, `sos_events`, `app_config`.
- **Máquina de estados `rides`:** `requested → assigned → driver_arrived → in_progress → completed`, salidas `cancelled_passenger | cancelled_driver | expired`. Montos en centavos de Bs (integer).
- **Puja (núcleo):**
  1. `create_ride(...)`: valida tarifa ≥ mínimo, inserta, busca conductores online aprobados con `ST_DWithin` (radio config) y les envía `realtime.send` a su canal privado + push.
  2. `make_offer(ride, price)`: una oferta activa por conductor/viaje, expira (config, p. ej. 45 s), conductor sin viaje activo.
  3. `accept_offer(offer)`: transacción con `SELECT … FOR UPDATE` sobre el ride; asigna, rechaza el resto; índice único parcial "1 viaje activo por conductor" evita doble asignación.
  4. Expiración por `pg_cron` (rides y ofertas vencidas).
- **Privacidad:** teléfono y ubicación del otro lado solo visibles tras `assigned` y hasta cerrar el viaje (RLS). Documentos en bucket privado, solo dueño + admin.
- **CI:** GitHub Actions: `tsc`, lint, `supabase test db`, build admin. Branch protection con esos checks (regla 4).
- **Costos a aprobar por el CTO (no gastar sin OK):** Twilio Verify SMS a Bolivia, Google Places/Routes (cap de presupuesto), Supabase Pro (US$25/mes al salir a piloto), cuentas Google Play (US$25) / Apple (US$99/año).
- **Riesgos:** GPS background en Android gama baja (lección QUIVO) → spike temprano; plan B Transistorsoft (licencia propia, la de QUIVO es por bundle id). Geocoding OSM pobre en Santa Cruz → Google Places + "fijar en mapa". Costo SMS → evaluar OTP por WhatsApp.
- Alternativa descartada: reutilizar stack QUIVO (NestJS + Redis + Better-Auth): más infraestructura y sin realtime listo; el CTO eligió app independiente.

## Backlog Linear (team `IND`)
Proyecto **"App Taxi 24 de Septiembre — MVP"** con 3 documentos (Arte, Arquitectura, Pantallas y flujos) y milestones. Labels: reusar `diseño`, `app`, `web`, `datos`, `Feature`; crear `backend`, `infra`, `seguridad`. Estado inicial Backlog; M0 en Todo. Prioridad: M0–M2 High, M3–M5 Medium, V2 Low. Sin fechas ni estimaciones hasta que el CTO dé capacidad del equipo. Dependencias con `blockedBy` donde aplique.

- **M0 Fundamentos:** nombre y logo con la directiva · aprobar costos (SMS, Google, cuentas tiendas) · crear repo + CI + branch protection · proyecto Supabase sa-east-1 · cuentas EAS / Google Cloud / Twilio · spike GPS background Android gama baja (go/no-go).
- **M1 Diseño Figma:** archivo Figma + variables (tokens) · librería de componentes (botones, inputs, cards de oferta, bottom sheets, chips, nav) · estilo de mapa oscuro · ilustraciones · flujo común · flujo pasajero · flujo conductor · admin web · prototipo navegable · validación con directiva y 5 taxistas.
- **M2 Backend núcleo:** schema + migraciones · RLS por tabla · auth teléfono OTP · storage documentos · `create_ride` + búsqueda PostGIS · `make_offer` · `accept_offer` atómico · transiciones de estado + cancelaciones · `pg_cron` expiraciones · canales realtime privados · edge function push · edge function proxy Places/Routes · tarifa sugerida · ratings · SOS · tests pgTAP de puja/RLS.
- **M3 App pasajero:** setup Expo + tema + navegación · onboarding/login/OTP/registro · home mapa + ubicación · búsqueda destino · ofrecer tarifa · esperar y lista de ofertas · conductor en camino (tracking) · viaje en curso + SOS · fin + calificación · historial/perfil.
- **M4 App conductor:** registro 4 pasos + subida docs · pendiente aprobación · online/offline + tracking background · solicitudes entrantes + contraoferta · flujo recoger→iniciar→finalizar · cobro efectivo + calificar · ganancias · historial.
- **M5 Admin sindicato:** setup Next.js + auth admin · aprobación de conductores · padrón/suspensión · viajes en vivo e historial · SOS/incidencias · configuración.
- **M6 Piloto:** QA plan + casos E2E puja · revisión seguridad (RLS, datos personales) · builds EAS Android (APK interno) · beta cerrada con N conductores del sindicato · monitoreo (Sentry) · términos y privacidad.
- **V2 (post-piloto):** chat in-app · programar viajes · compartir viaje (link público) · QR de pago · cobro de cuota/comisión a conductores · iOS en App Store · modo claro · multi-idioma.

## Ejecución (al aprobar)
1. Guardar este plan en el repo nuevo `~/Documents/taxi-24-septiembre/docs/plan-planificacion-mvp.md`; `git init`, `docs/handoff.md` con puntero (regla 8); `docs/arte.md`, `docs/arquitectura.md`, `docs/pantallas.md`, `docs/backlog.md`, `docs/decisiones.md` (aprobaciones de hoy, regla 14). Escritos por el chairman (docs permitidos).
2. Validación de stack: `/agent-council` corto (Supabase vs stack QUIVO vs Firebase) — regla 6. Si discrepa en algo material, paro y consulto antes de seguir.
3. Linear: crear proyecto + milestones + 3 documentos + labels faltantes (chairman). Crear ~70 issues desde `docs/backlog.md` → subagente **Sonnet** (cada issue: descripción breve, criterios de aceptación, labels, milestone, prioridad, `blockedBy`).
4. Crear repo GitHub privado `taxi-24-septiembre` con `gh repo create --private`, rama `docs/planificacion`, commit `docs:` + push + PR (solo docs: sin gate de revisión). Mergear requiere confirmación (aún no hay checks requeridos).
5. Memoria: entrada de proyecto nuevo en `MEMORY.md`.
6. Siguiente paso propuesto: arrancar M1 (Figma) cargando antes el skill `ui-workflow` (regla 7).

## Verificación
- `list_issues team=IND` → conteo igual al de `docs/backlog.md`; cada issue con milestone y label; muestreo de 5 issues con criterios de aceptación.
- Proyecto con 7 milestones (M0–M6) + V2 y 3 documentos visibles.
- `git log` del repo con el commit de docs; PR abierto en GitHub.
- No verificable hoy: capacidad del equipo / fechas, costos reales de SMS y Google en Bolivia.
