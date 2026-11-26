# Handoff — Vyro (app del Sindicato 24 de Septiembre)

Documento vivo. Se actualiza al cerrar cada iteración o PR.

## Reanudación
- **Hito activo:** M2 Backend núcleo (casi completo) + M3 App pasajero (arrancado con P-01).
- **Plan:** [`docs/plan-planificacion-mvp.md`](plan-planificacion-mvp.md) (aprobado por el CTO 2026-11-25). Backlog vivo: [`docs/backlog.md`](backlog.md) (las "Nota" de cada issue son contrato).
- **Siguiente paso concreto:**
  1. Hecho: Supabase remoto con 11 migraciones verificadas por huella, Edge Function `geo` desplegada (B-12/B-13), Google (Client IDs web + Android, secret cargado por el CTO), Email apagado, Realtime solo privado.
  2. Hecho: P-02 login con Google por **OAuth web de Supabase** (PR #14). E2E en emulador 2026-11-26: login → teléfono 70000001 (guardado en `private.contact_phones`) → matar y reabrir (sesión persiste) → cerrar sesión (vuelve a login).
  3. Hecho: P-03 home con mapa (MapLibre 11.5.1 + tiles OpenFreeMap con estilo propio empaquetado `apps/mobile/assets/map/vyro-dark.json` según `arte.md`), permiso con tarjeta previa, modo "fijar en mapa" y GPS apagado. Plan y verificación en [`docs/plan-p03.md`](plan-p03.md). **Cambiar de rama a una con MapLibre exige rebuild nativo.**
  4. Hecho: P-04 búsqueda de destino ([`docs/plan-p04.md`](plan-p04.md)); la búsqueda usa Geoapify (PR `fix/geo-geoapify`: migración `geo_daily_caps` aplicada en remoto y `geo` v5 desplegada el 2026-11-26, búsqueda verificada en el emulador). Hecho: fase 1 de pantallas (todas mockeadas, plan [`docs/plan-pantallas.md`](plan-pantallas.md)) + APK demo (2026-11-26). Siguiente: fase 2, cablear las pantallas al backend real (borrar `src/demo/`): propuesta en [`docs/plan-fase2.md`](plan-fase2.md), pendiente de aprobación del CTO. APK demo de fase 1 = tag `demo-fase1`. Después: B-11 push, índice de `sos_events.handled_by`, Q-02 aviso de privacidad (proveedores OSM en Alemania). Todo en capa gratuita (decisión del CTO 2026-11-26).
  4. Prueba en el Samsung J7 cuando el MVP demo esté listo.
- **Merge:** automático con CI verde (autorizado por el CTO): esperar todos los jobs (`typecheck`, `lint`, `build-admin`, `db-test`, `deno-geo`) en success sobre el head del PR y `gh pr merge --squash --delete-branch`.
- **Repo:** `jencarlosmoral3-max/taxi-24-septiembre` (público desde 2026-11-26). Para `gh` y `git push`: `export GH_TOKEN=$(gh auth token --user jencarlosmoral3-max)`.
- **Linear:** team `IND`, proyecto `P-IND-4`.

## Estado (2026-11-26)
- **Mergeado:** F-03 (monorepo + CI), B-01 schema, B-02 RLS, B-03 login con Google + teléfono de contacto (backend), B-04 storage, B-05…B-09 puja, spike GPS F-06 en emulador (PR #3–#10). Al cierre de la sesión: PR #11 (B-10 Realtime/GPS, B-14 calificaciones, B-15 SOS) y el PR de P-01 (tema + componentes) con merge automático por CI; confirmar su estado en GitHub. PR #15: B-12 proxy `geo` y B-13 tarifa sugerida. PR `fix/geo-geoapify`: proveedor Geoapify (Photon/Nominatim dan 403 a las IPs de Supabase), topes 60/10 min y 100/día por usuario, tope global 2700/día atado a la cuota de cada usuario, rutas > 150 km rechazadas.
- **Tests:** suite pgTAP en CI (`supabase db start` + `supabase test db`), 380 tests con PR #15; tests Deno de `supabase/functions/geo` en el job `deno-geo`. Script de carrera de `accept_offer`: `supabase/tests/race/accept_offer_race.sh` (solo en DB descartable; no corre en CI).
- **App móvil:** tema y componentes en `apps/mobile/src/{theme,components}`; pantalla de desarrollo `/dev-components`. El código del spike GPS (`/spike-gps`, `src/spike/`, `usesCleartextTraffic`) se retira antes del primer build de release (nota en C-03).
- **Build local del dev APK:** `CI=1 npx expo prebuild -p android --no-install` borra `android/local.properties`; compilar con `ANDROID_HOME=$HOME/Android/Sdk ./gradlew assembleDebug --max-workers=2 -PreactNativeArchitectures=x86_64` y el emulador apagado (13 GB de RAM). Después `adb reverse tcp:8081 tcp:8081` + `npx expo start`.
- **Supabase:** proyecto remoto `mrhwceepvcjcdntvnsgs` (plan Free, cuenta nueva del CTO) con las 11 migraciones aplicadas y verificadas por huella y la Edge Function `geo` (`verify_jwt` activo) desplegada. Plan Free pausa tras ~7 días sin uso: abrirlo antes de cada demo. Local: `supabase/.env` (ignorado por git) con las credenciales OAuth de Google.
- **Docs:** [arte](arte.md) · [arquitectura](arquitectura.md) · [pantallas](pantallas.md) · [backlog](backlog.md) · [decisiones](decisiones.md) · [runbook admin](runbook-admin.md) · [spike GPS](spike-gps.md).

- **Pantallas fase 1** ([`plan-pantallas.md`](plan-pantallas.md)), todas mergeadas con datos de ejemplo: base (#21), pasajero (#22), conductor (#23), comunes (#24), admin (#25), extras: registro, permiso de ubicación y lugares guardados (#26), trazado por calles en `geo` (#27), ruta en la solicitud y modo navegación del conductor (#28, ruta demo real de OSRM fija en `src/demo/route.ts`), entrada de prueba sin cuenta (este PR). Solo V2 queda sin pantalla (chat, programar, compartir viaje).
- **Panel admin demo:** GitHub Pages https://jencarlosmoral3-max.github.io/taxi-24-septiembre/ (workflow `admin-pages.yml`, deploy en push a `main`; aviso de demo, `noindex`, datos ficticios). El repo es **público** desde 2026-11-26 (decisión del CTO para Pages): nunca commitear nada sensible. Fase 2: el panel real necesita host con servidor (export estático no sirve para auth).
- **Entrada de prueba:** botón "Probar sin cuenta (demo)" con auth anónima de Supabase, visible con `EXPO_PUBLIC_DEMO_LOGIN=1` (`apps/mobile/.env`); la cuenta de prueba no pide teléfono. Quitar o restringir antes del piloto real; en fase 2 las RPC de viajes deben rechazar `is_anonymous`.
- **APK demo (2026-11-26):** `~/Documents/taxi-24-septiembre-apk/vyro-demo-2026-11-26.apk` (68 MB, `main` 2a0fb4d, ABIs armeabi-v7a + arm64-v8a, firmado con `debug.keystore`, SHA-1 `5E:8F:16…` registrado en Google). Build: `CI=1 npx expo prebuild -p android --no-install` y `./gradlew assembleRelease --max-workers=4 -PreactNativeArchitectures=armeabi-v7a,arm64-v8a` en `apps/mobile/android` con el emulador apagado y sin daemons de Gradle viejos (la RAM llena lo frena).
- **Remoto al 2026-11-26:** `geo` v6 desplegada por el CTO (trazado por calles, verificado en el emulador: la línea del viaje del pasajero sigue las calles). Migración `anon_demo_guard` aplicada con OK del CTO (12 RPC con guarda, topes de geo para anónimos, 18 políticas restrictivas; verificado por SQL).

## Decisiones
Ver [`docs/decisiones.md`](decisiones.md). Últimas: sin Figma (diseño en código), login con Google en vez de OTP, teléfono de contacto sin verificar, origen exacto para conductores, calificaciones anónimas para el calificado, Android mínimo 7.0.

## Pendiente del CTO
- Rotar el secret de Google OAuth y la API key de Geoapify (pegada en el chat el 2026-11-26) al finalizar el producto (decisión del CTO).
- Samsung J7 (Android desconocido, se asume ≥ 7.0) cuando el MVP demo esté listo, con la prueba de 2 h del GPS (go/no-go F-06).
- Activar "Allow anonymous sign-ins" en Supabase (Auth → Sign In / Providers) para el botón de prueba; sin eso muestra "La entrada de prueba no está habilitada".
- Deploys de Edge Functions: el clasificador de auto mode los bloquea al agente; el CTO los corre en su terminal (`npx supabase login` + `npx supabase functions deploy <fn> --project-ref mrhwceepvcjcdntvnsgs`; `login` no funciona con `!`).
- Google: la pantalla de consentimiento sigue en modo Prueba (solo correos cargados); publicarla si testers con otros Gmail usan Google.
- Borrar el repo viejo: `gh auth refresh -h github.com -s delete_repo`.
- Sin costos en el MVP: Supabase Free, mapas OSM, cuenta de Google Play ya existente.

## No verificado
- `geo` Geoapify: Codex no verificado (sin cuota hasta 2026-12-03). Hora exacta del reinicio diario de la cuota de Geoapify no verificada (el tope global deja margen 2700/3000).
- P-03: "Ahora no" persistente al volver de segundo plano y error de tiles sin red (el dev client sin red no carga el bundle). Tras el estilo empaquetado (último commit) el flujo de ubicación no se pudo re-probar: el emulador quedó sin entregar ubicación tras un crash de GL (también con el código anterior, que antes funcionaba). Probar en el J7.
- Mapa: contraste al sol directo y delta de tamaño del APK release sin medir. El estilo empaquetado es una copia parcheada de OpenFreeMap `dark` (2026-11-26); si OpenFreeMap cambia el esquema de tiles, regenerarlo.
- `BottomSheet.tsx` tiene el mismo `KeyboardAvoidingView` con `behavior` undefined en Android que tenía `/phone` (corregido en PR del fix de teclado, 2026-11-26). Corregir igual cuando una hoja con input (contraoferta, tarifa) entre en una pantalla real. Codex `verify-fix` de ese fix: no verificado (sin cuota hasta 2026-12-03).
- Unión real a canales Realtime por websocket, push, carga (B-17).
- GPS en teléfonos con ahorro de batería de fabricante (solo emulador).
- Branch protection: no disponible en plan Free con repo privado (403).
- Codex: no se corrió en esta sesión (revisiones con Opus + /security-review).
- P-01: tras la review de UI no se vio en pantalla el contador de `RequestCard`, la selección de contraoferta, el `BottomSheet`, el teclado ni la fuente agrandada; verificar en emulador al empezar P-02. Bordes de inputs con contraste < 3:1 (token aprobado, pendiente de decisión).
- Fase 1 de pantallas: Codex no verificado (sin cuota). Onboarding no recorrido en emulador; TalkBack y suavidad de la navegación tras los fixes de revisión sin probar en dispositivo; botón de prueba sin probar hasta activar la auth anónima; APK release sin probar en teléfono (solo flujos en el emulador con el dev client).
- Mobile `typecheck` usa `typedRoutes`: los tipos de rutas no se generan en CI; hoy pasa en clon limpio.

## Registro de planes cerrados
- 2026-11-25 · Planificación MVP — resultado: docs + Linear cargado.
- 2026-11-26 · Spike GPS en emulador — resultado: go en código; falta teléfono real (`docs/spike-gps.md`).
