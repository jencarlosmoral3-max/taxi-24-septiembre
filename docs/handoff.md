# Handoff — Vyro (app del Sindicato 24 de Septiembre)

Documento vivo. Se actualiza al cerrar cada iteración o PR.

## Reanudación
- **Hito activo:** M2 Backend núcleo (casi completo) + M3 App pasajero (arrancado con P-01).
- **Plan:** [`docs/plan-planificacion-mvp.md`](plan-planificacion-mvp.md) (aprobado por el CTO 2026-11-25). Backlog vivo: [`docs/backlog.md`](backlog.md) (las "Nota" de cada issue son contrato).
- **Siguiente paso concreto (sesión nueva):**
  1. Autenticar el MCP de Supabase (`/mcp` → supabase → Authenticate; scope de usuario, proyecto `mrhwceepvcjcdntvnsgs`). El CTO delegó al chairman la configuración remota.
  2. Por MCP: aplicar las migraciones de `supabase/migrations/` al proyecto remoto; proveedor Google (Client ID web y secret: backlog P-02 y `supabase/.env` local) con **"Skip nonce checks" apagado**; Realtime → Settings → desactivar "Allow public access"; verificar `pg_cron` y que `private.notify` entrega en remoto. Registrar en `docs/decisiones.md`.
  3. P-02: login con Google nativo (`@react-native-google-signin/google-signin` + `signInWithIdToken` con nonce), cliente Supabase con URL y publishable key (backlog P-01), pantalla de teléfono de contacto. Requiere rebuild del dev APK (módulos nativos).
  4. Después: B-11 push, B-12/B-13 (necesitan key de Google Maps Platform y aprobación de costo), pantallas P-03 en adelante.
- **Merge:** automático con CI verde (autorizado por el CTO): esperar los 4 jobs (`typecheck`, `lint`, `build-admin`, `db-test`) en success sobre el head del PR y `gh pr merge --squash --delete-branch`.
- **Repo:** `jencarlosmoral3-max/taxi-24-septiembre` (privado). Para `gh` y `git push`: `export GH_TOKEN=$(gh auth token --user jencarlosmoral3-max)`.
- **Linear:** team `IND`, proyecto `P-IND-4`.

## Estado (2026-11-26)
- **Mergeado:** F-03 (monorepo + CI), B-01 schema, B-02 RLS, B-03 login con Google + teléfono de contacto (backend), B-04 storage, B-05…B-09 puja, spike GPS F-06 en emulador (PR #3–#10). Al cierre de la sesión: PR #11 (B-10 Realtime/GPS, B-14 calificaciones, B-15 SOS) y el PR de P-01 (tema + componentes) con merge automático por CI; confirmar su estado en GitHub.
- **Tests:** suite pgTAP en CI (`supabase db start` + `supabase test db`), 355 tests con PR #11. Script de carrera de `accept_offer`: `supabase/tests/race/accept_offer_race.sh` (solo en DB descartable; no corre en CI).
- **App móvil:** tema y componentes en `apps/mobile/src/{theme,components}`; pantalla de desarrollo `/dev-components`. El código del spike GPS (`/spike-gps`, `src/spike/`, `usesCleartextTraffic`) se retira antes del primer build de release (nota en C-03).
- **Supabase:** proyecto remoto `mrhwceepvcjcdntvnsgs` (cuenta nueva del CTO), sin migraciones aplicadas todavía. Local: `supabase/.env` (ignorado por git) con las credenciales OAuth de Google.
- **Docs:** [arte](arte.md) · [arquitectura](arquitectura.md) · [pantallas](pantallas.md) · [backlog](backlog.md) · [decisiones](decisiones.md) · [runbook admin](runbook-admin.md) · [spike GPS](spike-gps.md).

## Decisiones
Ver [`docs/decisiones.md`](decisiones.md). Últimas: sin Figma (diseño en código), login con Google en vez de OTP, teléfono de contacto sin verificar, origen exacto para conductores, calificaciones anónimas para el calificado, Android mínimo 7.0.

## Pendiente del CTO
- Rotar el secret de Google OAuth (pasó por el chat).
- Teléfono real (Samsung J7; versión de Android desconocida, se asume ≥ 7.0) para la prueba de 2 h del GPS (go/no-go F-06).
- Borrar el repo viejo: `gh auth refresh -h github.com -s delete_repo`.
- Aprobación de costos F-02 (Google Maps Platform, Supabase Pro al piloto, Google Play).

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
