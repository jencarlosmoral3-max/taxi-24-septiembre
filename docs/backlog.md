# Backlog MVP — Vyro (app del Sindicato 24 de Septiembre)

Fuente de verdad del backlog cargado en Linear (team `IND`, proyecto "App Taxi 24 de Septiembre — MVP").
Formato: `ID · Título` | labels | prioridad | bloqueado por. Debajo: descripción y criterios de aceptación (CA).
Prioridad: High = M0–M2, Medium = M3–M6, Low = V2. Estado inicial: M0 → Todo, resto → Backlog. Sin fechas ni estimaciones.

---

## M0 · Fundamentos

### F-01 · Definir nombre comercial y logo con la directiva
labels: diseño | High | —
Reunión con la directiva para elegir el nombre de la app y aprobar logo (placeholder "Taxi 24").
CA: nombre aprobado por escrito · logo en SVG · registrado en `docs/decisiones.md`.

### F-02 · Aprobar presupuesto de servicios externos
labels: infra | High | —
CTO aprueba: Twilio Verify (SMS a Bolivia), Google Maps Platform (Places/Routes con cap), Supabase Pro para piloto, Google Play (US$25), Apple Developer (US$99/año, V2).
CA: monto mensual estimado por servicio · aprobación en `docs/decisiones.md` · alertas de presupuesto configuradas.

### F-03 · Repo GitHub + CI + branch protection
labels: infra | High | —
Monorepo pnpm (`apps/mobile`, `apps/admin`, `supabase/`). GitHub Actions: `tsc`, lint, `supabase test db`, build admin. Branch protection en `main` con esos checks requeridos.
CA: PR de prueba bloqueado si falla `tsc` · checks requeridos visibles en settings.

### F-04 · Proyecto Supabase sa-east-1 (dev y prod)
labels: infra, backend | High | F-02
Dos proyectos (dev, prod) en São Paulo. PostGIS, pg_cron y pg_net habilitados. Supabase CLI enlazado; migraciones solo vía repo.
CA: `supabase db push` desde CI a dev · secretos solo en GitHub Secrets / Supabase.

### F-05 · Cuentas de terceros: EAS, Google Cloud, Twilio
labels: infra | High | F-02
Cuenta Expo/EAS de la organización, proyecto Google Cloud con API keys restringidas (Android SHA-1, Places/Routes solo server), Twilio Verify.
CA: keys restringidas · documentado dónde vive cada secreto (sin valores).

### F-06 · Spike GPS en segundo plano en Android gama baja (go/no-go)
labels: app | High | —
App mínima Expo con `expo-location` + `expo-task-manager` + foreground service enviando posición cada 5 s a Supabase. Probar 2 h en 2–3 teléfonos gama baja reales (Xiaomi/Samsung A) con pantalla apagada.
CA: % de puntos recibidos vs esperados por teléfono · decisión go (expo-location) o plan B (Transistorsoft, licencia propia) en `docs/decisiones.md`.

---

## M1 · Diseño Figma

### D-01 · Archivo Figma + variables (tokens)
labels: diseño | High | F-01
Archivo nuevo con páginas: Portada, Tokens, Componentes, Común, Pasajero, Conductor, Admin, Prototipo (con Figma Starter: 3 páginas, ver `docs/decisiones.md`). Variables de color, tipografía, radios y espaciado según `docs/arte.md`.
CA: todas las variables de `docs/arte.md` creadas · contraste AA verificado para texto sobre `danger`/`success`.

### D-02 · Librería de componentes
labels: diseño | High | D-01
Botones (primario, secundario, peligro, pill), inputs (texto, teléfono +591, OTP, monto Bs), cards de oferta, card de pedido entrante, bottom sheets, chips, toggle En línea, tab bar, rating, marcadores de mapa.
CA: componentes con variantes y auto layout · usan solo variables.

### D-03 · Estilo de mapa oscuro
labels: diseño | High | D-01
JSON de estilo Google Maps alineado a la paleta + marcadores.
CA: JSON exportado al repo (`apps/mobile/assets/map-style.json`) · captura de Santa Cruz centro.

### D-04 · Ilustraciones propias
labels: diseño | Medium | D-01
Onboarding x3, búsqueda de conductor, estados vacíos (sin viajes, sin solicitudes), pendiente de aprobación. Temática taxi amarillo + Santa Cruz.
CA: SVG/PNG optimizados · coherentes con la paleta.

### D-05 · Pantallas flujo común
labels: diseño | High | D-02
Splash, onboarding, login teléfono, OTP, registro, permiso ubicación, perfil/ajustes, soporte, historial (ver `docs/pantallas.md`).
CA: todas las pantallas listadas · estados de error y carga.

### D-06 · Pantallas flujo pasajero
labels: diseño | High | D-02, D-03
Home, buscar destino, ofrecer tarifa, esperando ofertas, lista de ofertas, en camino, llegó, en curso + SOS, fin + calificación, cancelación.
CA: pantallas listadas · estados: sin ofertas, oferta expirada, conductor canceló.

### D-07 · Pantallas flujo conductor
labels: diseño | High | D-02, D-03
Registro 4 pasos, pendiente, home online/offline, solicitudes entrantes + contraoferta, esperando respuesta, ir a recoger, llegué, en viaje, cobro + calificar, ganancias.
CA: pantallas listadas · estados: oferta rechazada, pasajero canceló, sin conexión.

### D-08 · Pantallas panel admin web
labels: diseño, web | Medium | D-02
Login, solicitudes de conductores, padrón, viajes en vivo/historial, SOS, configuración. Desktop 1440.
CA: pantallas listadas con tablas y filtros.

### D-09 · Prototipo navegable
labels: diseño | High | D-05, D-06, D-07
Prototipo Figma del camino feliz pasajero y conductor (puja completa).
CA: link de prototipo compartible · recorre pedido → oferta → aceptar → viaje → calificación.

### D-10 · Validación con directiva y 5 taxistas
labels: diseño | High | D-09
Sesiones con el prototipo. Registrar hallazgos y ajustes.
CA: notas de 5+ sesiones en `docs/validacion-diseno.md` · cambios aplicados o descartados con motivo · aprobación de la directiva.

---

## M2 · Backend núcleo

### B-01 · Schema inicial y migraciones
labels: backend, datos | High | F-04
Tablas: `profiles`, `drivers`, `vehicles`, `driver_documents`, `driver_locations` (geography Point, `is_online`, `updated_at`), `rides`, `ride_offers`, `ratings`, `sos_events`, `app_config`. Enums de estado. Montos en centavos (integer). Índices GIST en ubicaciones.
CA: migraciones aplican limpio en local y dev · tipos generados con `supabase gen types`.

### B-02 · RLS en todas las tablas
labels: backend, seguridad | High | B-01
Políticas por rol (pasajero, conductor, admin). Teléfono y ubicación del otro lado visibles solo desde `assigned` hasta cerrar el viaje.
Nota (review B-01): `anon` y `authenticated` arrancan sin privilegios. Cada acceso se concede explícito: `grant select (columnas) ...` y `grant execute on function ...`. RLS filtra filas, no columnas: `drivers.status`, `rating_*`, `ci_number`, `license_number` y `push_token` nunca se exponen ni se escriben directo. Las funciones nuevas no son ejecutables por nadie por defecto (revoke global para `postgres`): helpers de políticas y RPCs necesitan `grant execute ... to authenticated`.
CA: RLS activado en 100% de tablas · tests pgTAP de acceso cruzado (pasajero A no ve viaje de B).

### B-03 · Login con Google + teléfono de contacto
labels: backend, seguridad | High | B-01
Decisión del CTO (2026-11-26): login con Google en vez de OTP por SMS (sin costo). Supabase Auth Google con `signInWithIdToken` desde la app nativa. Trigger que crea `profiles` (hecho en PR #8). Teléfono de contacto declarado por el usuario (+591, sin verificar) en tabla privada; la contraparte lo ve solo por `get_ride_contact`. Claim `role` para admin. Login por teléfono (OTP) desactivado; queda como opción post-piloto (WhatsApp).
Nota (B-02): `profiles` no tiene grant de insert; el trigger sobre `auth.users` crea el perfil de **todo** usuario, admins incluidos.
Requiere del CTO: proyecto en Google Cloud con pantalla de consentimiento y clientes OAuth (web + Android con el SHA-1 de la firma).
CA: login completo con cuenta Google real en Android · teléfono guardado y visible a la contraparte solo desde `assigned` · admin solo por claim asignado manualmente.

### B-04 · Storage de documentos de conductor
labels: backend, seguridad | High | B-02
Bucket privado `driver-docs`; solo dueño escribe/lee lo suyo; admin lee todo. URLs firmadas de corta duración.
Nota (B-02): las políticas del bucket replican la regla de la tabla: el path empieza con `<auth.uid()>/`. Reemplazar un documento rechazado requiere RPC (no hay grant de update/delete en `driver_documents`).
Nota (review B-04): las pruebas pgTAP cubren las políticas, no la Storage API. Falta smoke con supabase-js en stack completo (upload, upsert rechazado, signed URL ajena rechazada, `list` solo propio, MIME `text/html` rechazado).
CA: test: otro conductor no puede leer documentos ajenos.

### B-05 · RPC `create_ride` + búsqueda de conductores cercanos
labels: backend | High | B-02
Valida tarifa ≥ mínimo de `app_config`; índice único parcial "1 pedido abierto por pasajero"; inserta con `expires_at`; busca conductores aprobados, en línea y libres con `ST_DWithin` (radio configurable, ubicación de < 60 s); notifica por `realtime.send` al canal privado `driver:{id}` + push FCM de alta prioridad.
Nota (review B-01): funciones con `search_path = ''` deben calificar PostGIS: `extensions.st_dwithin`, `::extensions.geography`, `OPERATOR(extensions.<->)`. Un test pgTAP debe ejercitar `ST_DWithin` desde la RPC.
CA: tests pgTAP: tarifa bajo mínimo rechazada · conductor fuera de radio o suspendido no notificado.

### B-06 · RPC `make_offer` (aceptar precio o contraofertar)
labels: backend | High | B-05
Una oferta activa por conductor y viaje; expira según config (~45 s); conductor sin viaje activo; notifica al pasajero.
Nota (review B-01): reemplazo de oferta con `insert ... on conflict (ride_id, driver_id) where status = 'active' do update`. Orden de locks: siempre ride primero, ofertas después.
CA: tests: segunda oferta reemplaza la anterior · oferta sobre viaje no `requested` rechazada.

### B-07 · RPC `accept_offer` atómico
labels: backend | High | B-06
Transacción con `SELECT … FOR UPDATE` sobre el ride; valida oferta vigente; asigna conductor; rechaza las demás ofertas; índice único parcial "un viaje activo por conductor" impide doble asignación.
Nota (review B-01): al asignar, expirar las otras ofertas activas del mismo conductor en otros pedidos y traducir 23505 a un error de negocio. Guardar `accepted_offer_id` y `vehicle_id`. Idempotencia: si el ride ya tiene ese `accepted_offer_id`, devolver éxito.
CA: test de concurrencia: dos aceptaciones simultáneas → exactamente una gana · conductor nunca queda con 2 viajes activos.

### B-08 · Transiciones de estado y cancelaciones
labels: backend | High | B-07
RPCs `driver_arrived`, `start_ride`, `complete_ride`, `cancel_ride(motivo)`. Máquina de estados estricta: `requested → assigned → driver_arrived → in_progress → completed`; salidas `cancelled_passenger`, `cancelled_driver`, `expired`.
CA: tests: transición inválida rechazada · solo el actor correcto puede ejecutar cada transición.

### B-09 · Expiración: `expires_at` en cada RPC + limpieza con pg_cron
labels: backend | High | B-06
La corrección no depende del cron: cada RPC valida `expires_at`. Job pg_cron cada 30–60 s solo limpia: expira ofertas vencidas y pedidos sin asignar tras N minutos; marca conductores sin ubicación reciente como fuera de línea.
CA: test: pedido viejo pasa a `expired` y notifica al pasajero.

### B-10 · Realtime privado y GPS de flota
labels: backend, seguridad | High | B-02
Solo Broadcast privado (nada de `postgres_changes`): canales `driver:{id}`, `rider:{id}`, `trip:{id}` con políticas sobre `realtime.messages`. GPS de flota por RPC `upsert_driver_location` (una fila por conductor, envío adaptativo 5–15 s, autovacuum ajustado); posición en vivo del viaje por `trip:{id}`; historial solo durante viaje en lotes.
Nota (review B-05): políticas de `realtime.messages` con igualdad exacta (nunca `LIKE`) y `extension = 'broadcast'`: SELECT `driver:<uid>` solo si el usuario tiene fila en `drivers`, `rider:<uid>` propio, `trip:<id>` solo pasajero o conductor asignado (conocer el id no basta). INSERT denegado en `driver:*` y `rider:*` (solo el servidor emite); en `trip:*` solo el conductor asignado con viaje activo. `upsert_driver_location` rechaza saltos imposibles (velocidad/distancia) para que un conductor no barra la ciudad con `get_nearby_requests`; decidir si redondear coordenadas a ~100 m hasta `assigned`.
CA: un usuario no puede unirse al canal de otro · la app reconcilia el estado del ride al reconectar.

### B-11 · Edge function de notificaciones push
labels: backend | Medium | B-05
Envío vía Expo Push para: nuevo pedido cercano, nueva oferta, oferta aceptada, conductor llegó, viaje cancelado. Tokens en `profiles`.
CA: push recibido en Android con app en segundo plano.

### B-12 · Edge function proxy Places / Routes
labels: backend | High | F-05
Proxy de Google Places Autocomplete (session tokens, sesgo a Santa Cruz) y Routes (distancia/duración). Key nunca en la app. Rate limit por usuario.
CA: la app no contiene la key server · costo por pedido estimado y documentado.

### B-13 · Tarifa sugerida
labels: backend | Medium | B-12
Fórmula simple configurable (base + Bs/km + Bs/min) con distancia/duración de Routes; redondeo a Bs enteros; nunca menor al mínimo.
CA: tabla de config editable por admin · tests de la fórmula.

### B-14 · Calificaciones
labels: backend | Medium | B-08
RPC `rate_ride` (1–5 + comentario) para ambos lados, solo una vez y solo en viajes `completed`. Promedio en perfil.
CA: tests: doble calificación rechazada · calificar viaje ajeno rechazado.

### B-15 · SOS
labels: backend, seguridad | High | B-10
RPC `trigger_sos` registra evento con ubicación y viaje; notifica al panel admin por Broadcast + push. El cliente reintenta hasta confirmar (no depende del WebSocket).
CA: evento visible en admin en < 3 s · reintento verificado sin red momentánea.

### B-16 · Suite pgTAP de puja y RLS en CI
labels: backend, infra | High | B-07, F-03
Tests de B-02 a B-15 corriendo en GitHub Actions con `supabase test db`.
CA: check requerido en branch protection.

### B-17 · Prueba de carga de puja y GPS
labels: backend, infra | High | B-10, B-07
Script que simula 500 conductores enviando GPS + 50 pujas simultáneas contra staging.
CA: p95 de `accept_offer` y `upsert_driver_location` medidos · sin dobles asignaciones · consumo de cuota Supabase estimado por mes.

---

## M3 · App pasajero

### P-01 · Setup Expo + tema + navegación
labels: app | Medium | F-03, D-01
Expo Router, TypeScript estricto, tokens de `docs/arte.md` como tema, fuentes Poppins, TanStack Query, Zustand, cliente Supabase, EAS dev build con Google Maps.
CA: dev build Android corre en teléfono real · tema aplicado.

### P-02 · Onboarding, login, OTP y registro
labels: app | Medium | P-01, B-03, D-05
CA: login completo con número real · sesión persiste al reabrir · errores (código inválido, sin red) manejados.

### P-03 · Home con mapa y ubicación actual
labels: app | Medium | P-01, D-03, D-06
Mapa oscuro, ubicación actual, permiso de ubicación con pantalla previa.
CA: funciona con permiso denegado (mensaje + fijar en mapa).

### P-04 · Búsqueda de destino
labels: app | Medium | P-03, B-12
Autocomplete con debounce y session token, lugares guardados, fijar en mapa.
CA: una sesión de autocomplete = un cobro de Places (session token verificado).

### P-05 · Ofrecer tarifa y crear pedido
labels: app | Medium | P-04, B-05, B-13
Tarifa sugerida, validación de mínimo, nº pasajeros, comentario, efectivo.
CA: tarifa bajo mínimo bloqueada en UI y en backend.

### P-06 · Esperar y elegir ofertas
labels: app | Medium | P-05, B-07, B-10
Recibe ofertas en tiempo real con cuenta regresiva, subir tarifa, aceptar/rechazar, cancelar.
CA: oferta expirada desaparece · aceptar con red lenta no duplica (idempotente).

### P-07 · Conductor en camino y llegada
labels: app | Medium | P-06, B-08
Taxi en vivo en mapa, ETA, datos del auto y nº interno, llamar, cancelar con motivo.
CA: posición se actualiza ≤ 10 s · reconecta tras perder red.

### P-08 · Viaje en curso + SOS
labels: app, seguridad | Medium | P-07, B-15
CA: SOS abre marcador 110 y crea evento en backend en un toque + confirmación.

### P-09 · Fin de viaje, pago efectivo y calificación
labels: app | Medium | P-07, B-14
CA: monto final mostrado · calificación enviada una vez.

### P-10 · Historial, perfil y soporte
labels: app | Medium | P-02
Historial con detalle, editar perfil, eliminar cuenta, soporte por WhatsApp del sindicato.
CA: eliminar cuenta borra/anonimiza datos personales.

---

## M4 · App conductor

### C-01 · Registro de conductor en 4 pasos
labels: app | Medium | P-02, B-04, D-07
Datos + nº interno, licencia + CI, vehículo (placa, RUAT, SOAT), fotos. Compresión de imágenes antes de subir.
Nota (B-02): un conductor aprobado no puede editar vehículos por la API (solo `pending`/`rejected`); renovar SOAT o cambiar de auto va por RPC. `ruat` y `soat_expires_at` no se leen por la API: RPC del dueño.
CA: reanuda si se cierra la app a mitad · fotos < 1 MB.

### C-02 · Estado pendiente de aprobación y switch de modo
labels: app | Medium | C-01
Nota (review B-02): los inserts/updates desde el cliente deben pedir columnas explícitas (`.select('id,status,...')`); sin lista, PostgREST pide todas y falla con 42501 por las columnas no concedidas (`push_token`, `ci_number`, `license_number`). El motivo de rechazo se lee con `get_my_driver_application()`.
CA: modo conductor bloqueado hasta `approved` · notificación al ser aprobado/rechazado.

### C-03 · En línea / fuera de línea + tracking en segundo plano
labels: app | Medium | C-02, F-06, B-10
Foreground service con notificación persistente mientras está en línea; envío adaptativo vía `upsert_driver_location`; push FCM de alta prioridad para pedidos con la app en segundo plano.
Nota (spike F-06): antes de cualquier build de release (M6) quitar `src/app/spike-gps.tsx`, `src/spike/`, el import en `_layout.tsx` y `usesCleartextTraffic` de `app.json`; la tabla `supabase/spikes/gps_spike.sql` nunca va a remoto.
CA: tracking sigue con pantalla apagada (según resultado de F-06) · al pasar a fuera de línea se detiene.

### C-04 · Solicitudes entrantes y contraoferta
labels: app | Medium | C-03, B-06
Lista de pedidos cercanos con sonido, aceptar a precio, contraoferta (+1/+2/+5 Bs o libre), ignorar.
CA: pedido tomado por otro desaparece en < 2 s.

### C-05 · Flujo recoger → llegué → iniciar → finalizar
labels: app | Medium | C-04, B-08
Deep link "Navegar" a Google Maps/Waze, llamar al pasajero.
CA: cada botón solo aparece en el estado válido.

### C-06 · Cobro en efectivo y calificar pasajero
labels: app | Medium | C-05, B-14
CA: resumen del viaje con monto a cobrar.

### C-07 · Ganancias e historial del conductor
labels: app | Medium | C-06
CA: totales de hoy/semana coinciden con viajes `completed`.

---

## M5 · Panel admin del sindicato

### A-01 · Setup Next.js + auth admin
labels: web | Medium | F-03, B-03, D-08
Next.js App Router en Vercel, login con Supabase, solo claim `admin`.
Nota (review B-02): exigir MFA para admin (`auth.jwt() ->> 'aal' = 'aal2'` en `private.is_admin()`) y JWT corto: quitar el rol admin tarda hasta que vence el token (`jwt_expiry` 3600).
CA: usuario sin claim recibe 403.

### A-02 · Aprobación de conductores
labels: web | Medium | A-01, B-04
Ver documentos (URLs firmadas), aprobar/rechazar con motivo.
Nota (B-02): aprobar/rechazar va por RPC de admin (no hay grant de update sobre `drivers.status`). Al aprobar, limpiar `rejected_reason`.
Nota (review B-04): el panel pide URLs firmadas de ≤ 60 s para ver documentos.
CA: cambio de estado notifica al conductor.

### A-03 · Padrón de conductores y vehículos
labels: web | Medium | A-01
Búsqueda, suspender/reactivar.
CA: conductor suspendido deja de recibir pedidos al instante.

### A-04 · Viajes en vivo e historial
labels: web | Medium | A-01, B-10
Mapa con conductores en línea y viajes activos; historial filtrable.
CA: datos personales mínimos en listados.

### A-05 · SOS e incidencias
labels: web, seguridad | Medium | A-01, B-15
Alerta sonora en tiempo real, marcar atendida.
CA: SOS aparece en < 3 s.

### A-06 · Configuración de la operación
labels: web | Medium | A-01, B-13
Tarifa mínima, radio, expiración de ofertas/pedidos, fórmula de tarifa sugerida.
CA: cambios auditados (quién y cuándo).

---

## M6 · Piloto

### Q-01 · Plan de QA y casos E2E de la puja
labels: app | Medium | P-06, C-04
Casos manuales + E2E del camino feliz y concurrencia (2 conductores, 1 pedido).
CA: checklist en `docs/qa-piloto.md` ejecutado en 2 teléfonos.

### Q-02 · Revisión de seguridad y datos personales
labels: seguridad | Medium | B-16, A-02
`/security-review` + review Opus: RLS, storage, realtime, secretos, exposición de teléfonos/ubicación.
CA: hallazgos cerrados o aceptados por el CTO por escrito.

### Q-03 · Términos, privacidad y consentimiento
labels: contenido | Medium | F-01
Términos de uso y política de privacidad (datos de ubicación, documentos). Pantalla de aceptación en registro.
CA: textos revisados por el sindicato · aceptación registrada con fecha.

### Q-04 · Monitoreo de errores
labels: infra | Medium | P-01, A-01
Sentry en app y admin; alertas de errores en Edge Functions.
CA: error forzado visible en Sentry.

### Q-05 · Builds EAS Android para piloto
labels: app, infra | Medium | Q-01
APK/AAB interno + canal EAS Update para OTA.
CA: instalación en teléfono limpio sin Expo Go.

### Q-06 · Beta cerrada con conductores del sindicato
labels: entrega | Medium | Q-02, Q-03, Q-05, B-17
N conductores + pasajeros invitados durante 2 semanas. Métricas: pedidos, % con oferta, tiempo a primera oferta, cancelaciones, errores.
CA: reporte de piloto en `docs/piloto.md` con decisión go/no-go a lanzamiento.

---

## V2 · Post-piloto (Low, Backlog)

### V-01 · Chat in-app pasajero–conductor
labels: app, Feature | Low | Q-06
### V-02 · Programar viajes
labels: app, Feature | Low | Q-06
### V-03 · Compartir viaje por link público
labels: app, web, seguridad | Low | Q-06
### V-04 · Pago por QR bancario
labels: app, Feature | Low | Q-06
### V-05 · Cobro de cuota/comisión a conductores del sindicato
labels: backend, Feature | Low | Q-06
### V-06 · Publicación en iOS (App Store)
labels: app | Low | Q-06
### V-07 · Modo claro
labels: diseño, app | Low | Q-06
### V-08 · Ubicaciones de flota en Redis (si se superan ~2.000 conductores en línea)
labels: backend | Low | B-17
