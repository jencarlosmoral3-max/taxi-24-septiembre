# Handoff — Vyro (app del Sindicato 24 de Septiembre)

Documento vivo. Se actualiza al cerrar cada iteración o PR.

## Reanudación
- **Hito activo:** M2 Backend núcleo (casi completo) + M3 App pasajero (arrancado con P-01).
- **Plan:** [`docs/plan-planificacion-mvp.md`](plan-planificacion-mvp.md) (aprobado por el CTO 2026-11-25). Backlog vivo: [`docs/backlog.md`](backlog.md) (las "Nota" de cada issue son contrato).
- **Siguiente paso concreto:**
  1. CTO (dashboard Supabase, proyecto `mrhwceepvcjcdntvnsgs`): Authentication → Sign In / Providers → Google: activar, Client IDs = cliente web (backlog P-02), Client Secret = el de `supabase/.env`, **Skip nonce checks apagado**. Realtime → Settings: desactivar "Allow public access". Hecho por el chairman: migraciones aplicadas y verificadas (ver `docs/decisiones.md`).
  2. P-02 (login con Google + teléfono) en curso en la rama `feat/p02-google-login`; probar login real contra el remoto cuando el paso 1 esté hecho. Requiere rebuild del dev APK.
  3. Después: B-11 push, B-12 proxy OSM (Photon/Nominatim + OSRM) y B-13 tarifa sugerida, P-03 mapa con MapLibre + OpenFreeMap, resto de pantallas. Todo en capa gratuita (decisión del CTO 2026-11-26).
  4. Prueba en el Samsung J7 cuando el MVP demo esté listo.
- **Merge:** automático con CI verde (autorizado por el CTO): esperar los 4 jobs (`typecheck`, `lint`, `build-admin`, `db-test`) en success sobre el head del PR y `gh pr merge --squash --delete-branch`.
- **Repo:** `jencarlosmoral3-max/taxi-24-septiembre` (privado). Para `gh` y `git push`: `export GH_TOKEN=$(gh auth token --user jencarlosmoral3-max)`.
- **Linear:** team `IND`, proyecto `P-IND-4`.

## Estado (2026-11-26)
- **Mergeado:** F-03 (monorepo + CI), B-01 schema, B-02 RLS, B-03 login con Google + teléfono de contacto (backend), B-04 storage, B-05…B-09 puja, spike GPS F-06 en emulador (PR #3–#10). Al cierre de la sesión: PR #11 (B-10 Realtime/GPS, B-14 calificaciones, B-15 SOS) y el PR de P-01 (tema + componentes) con merge automático por CI; confirmar su estado en GitHub.
- **Tests:** suite pgTAP en CI (`supabase db start` + `supabase test db`), 355 tests con PR #11. Script de carrera de `accept_offer`: `supabase/tests/race/accept_offer_race.sh` (solo en DB descartable; no corre en CI).
- **App móvil:** tema y componentes en `apps/mobile/src/{theme,components}`; pantalla de desarrollo `/dev-components`. El código del spike GPS (`/spike-gps`, `src/spike/`, `usesCleartextTraffic`) se retira antes del primer build de release (nota en C-03).
- **Supabase:** proyecto remoto `mrhwceepvcjcdntvnsgs` (plan Free, cuenta nueva del CTO) con las 9 migraciones aplicadas y verificadas por huella. Plan Free pausa tras ~7 días sin uso: abrirlo antes de cada demo. Local: `supabase/.env` (ignorado por git) con las credenciales OAuth de Google.
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
- GPS en teléfonos con ahorro de batería de fabricante (solo emulador).
- Branch protection: no disponible en plan Free con repo privado (403).
- Codex: no se corrió en esta sesión (revisiones con Opus + /security-review).
- P-01: tras la review de UI no se vio en pantalla el contador de `RequestCard`, la selección de contraoferta, el `BottomSheet`, el teclado ni la fuente agrandada; verificar en emulador al empezar P-02. Bordes de inputs con contraste < 3:1 (token aprobado, pendiente de decisión).
- Mobile `typecheck` usa `typedRoutes`: los tipos de rutas no se generan en CI; hoy pasa en clon limpio.

## Registro de planes cerrados
- 2026-11-25 · Planificación MVP — resultado: docs + Linear cargado.
- 2026-11-26 · Spike GPS en emulador — resultado: go en código; falta teléfono real (`docs/spike-gps.md`).
