# Handoff — Vyro (app del Sindicato 24 de Septiembre)

Documento vivo. Se actualiza al cerrar cada iteración o PR.

## Reanudación
- **Hito activo:** M2 Backend núcleo (casi completo) + M3 App pasajero (arrancado con P-01).
- **Plan:** [`docs/plan-planificacion-mvp.md`](plan-planificacion-mvp.md) (aprobado por el CTO 2026-11-25). Backlog vivo: [`docs/backlog.md`](backlog.md) (las "Nota" de cada issue son contrato).
- **Siguiente paso concreto:**
  1. Hecho: Supabase remoto con 11 migraciones verificadas por huella, Edge Function `geo` desplegada (B-12/B-13), Google (Client IDs web + Android, secret cargado por el CTO), Email apagado, Realtime solo privado.
  2. P-02 (rama `feat/p02-google-login`, PR #14 en borrador): login pasado a **OAuth web de Supabase** (ver decisiones). Falta: (a) CTO agrega `vyro://**` en Supabase → Authentication → URL Configuration → Redirect URLs; (b) rebuild del dev APK (entra `expo-web-browser`, módulo nativo; con el emulador cerrado durante gradle, la máquina se quedó sin memoria la vez anterior); (c) prueba E2E en emulador: login → teléfono 70000001 → cerrar y reabrir (sesión persiste) → cerrar sesión. Recién ahí PR listo y merge (condición de la review Opus).
  3. Después: P-03 mapa con MapLibre + OpenFreeMap (con "© OpenStreetMap contributors"), B-11 push, índice de `sos_events.handled_by`, Q-02 aviso de privacidad (proveedores OSM en Alemania). Todo en capa gratuita (decisión del CTO 2026-11-26).
  4. Prueba en el Samsung J7 cuando el MVP demo esté listo.
- **Merge:** automático con CI verde (autorizado por el CTO): esperar todos los jobs (`typecheck`, `lint`, `build-admin`, `db-test`, `deno-geo`) en success sobre el head del PR y `gh pr merge --squash --delete-branch`.
- **Repo:** `jencarlosmoral3-max/taxi-24-septiembre` (privado). Para `gh` y `git push`: `export GH_TOKEN=$(gh auth token --user jencarlosmoral3-max)`.
- **Linear:** team `IND`, proyecto `P-IND-4`.

## Estado (2026-11-26)
- **Mergeado:** F-03 (monorepo + CI), B-01 schema, B-02 RLS, B-03 login con Google + teléfono de contacto (backend), B-04 storage, B-05…B-09 puja, spike GPS F-06 en emulador (PR #3–#10). Al cierre de la sesión: PR #11 (B-10 Realtime/GPS, B-14 calificaciones, B-15 SOS) y el PR de P-01 (tema + componentes) con merge automático por CI; confirmar su estado en GitHub. PR #15: B-12 proxy `geo` (Photon, Nominatim, OSRM) y B-13 tarifa sugerida.
- **Tests:** suite pgTAP en CI (`supabase db start` + `supabase test db`), 380 tests con PR #15; tests Deno de `supabase/functions/geo` en el job `deno-geo`. Script de carrera de `accept_offer`: `supabase/tests/race/accept_offer_race.sh` (solo en DB descartable; no corre en CI).
- **App móvil:** tema y componentes en `apps/mobile/src/{theme,components}`; pantalla de desarrollo `/dev-components`. El código del spike GPS (`/spike-gps`, `src/spike/`, `usesCleartextTraffic`) se retira antes del primer build de release (nota en C-03).
- **Supabase:** proyecto remoto `mrhwceepvcjcdntvnsgs` (plan Free, cuenta nueva del CTO) con las 11 migraciones aplicadas y verificadas por huella y la Edge Function `geo` (`verify_jwt` activo) desplegada. Plan Free pausa tras ~7 días sin uso: abrirlo antes de cada demo. Local: `supabase/.env` (ignorado por git) con las credenciales OAuth de Google.
- **Docs:** [arte](arte.md) · [arquitectura](arquitectura.md) · [pantallas](pantallas.md) · [backlog](backlog.md) · [decisiones](decisiones.md) · [runbook admin](runbook-admin.md) · [spike GPS](spike-gps.md).

## Decisiones
Ver [`docs/decisiones.md`](decisiones.md). Últimas: sin Figma (diseño en código), login con Google en vez de OTP, teléfono de contacto sin verificar, origen exacto para conductores, calificaciones anónimas para el calificado, Android mínimo 7.0.

## Pendiente del CTO
- Rotar el secret de Google OAuth al finalizar el producto (decisión del CTO).
- Samsung J7 (Android desconocido, se asume ≥ 7.0) cuando el MVP demo esté listo, con la prueba de 2 h del GPS (go/no-go F-06).
- Borrar el repo viejo: `gh auth refresh -h github.com -s delete_repo`.
- Sin costos en el MVP: Supabase Free, mapas OSM, cuenta de Google Play ya existente.

## No verificado
- Login real con Google, unión real a canales Realtime por websocket, push, carga (B-17).
- `geo` desplegada: solo se verificó el 401 sin JWT; falta una llamada con JWT real (depende del login).
- GPS en teléfonos con ahorro de batería de fabricante (solo emulador).
- Branch protection: no disponible en plan Free con repo privado (403).
- Codex: no se corrió en esta sesión (revisiones con Opus + /security-review).
- P-01: tras la review de UI no se vio en pantalla el contador de `RequestCard`, la selección de contraoferta, el `BottomSheet`, el teclado ni la fuente agrandada; verificar en emulador al empezar P-02. Bordes de inputs con contraste < 3:1 (token aprobado, pendiente de decisión).
- Mobile `typecheck` usa `typedRoutes`: los tipos de rutas no se generan en CI; hoy pasa en clon limpio.

## Registro de planes cerrados
- 2026-11-25 · Planificación MVP — resultado: docs + Linear cargado.
- 2026-11-26 · Spike GPS en emulador — resultado: go en código; falta teléfono real (`docs/spike-gps.md`).
