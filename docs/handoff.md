# Handoff — Vyro (app del Sindicato 24 de Septiembre)

Documento vivo. Se actualiza al cerrar cada iteración o PR.

## Reanudación
- **Hito activo:** planificación del MVP → cerrada al mergear este PR. Siguiente: **M0 Fundamentos** + **M1 Diseño Figma**.
- **Plan:** [`docs/plan-planificacion-mvp.md`](plan-planificacion-mvp.md) (aprobado por el CTO 2026-11-25).
- **Siguiente paso concreto:** spike GPS F-06 en emulador (`docs/plan-spike-gps.md`), después M2 backend (B-01 schema) y el tema + componentes base en `apps/mobile` (sin Figma, decisión del CTO 2026-11-25). Merge automático con CI verde (autorizado por el CTO).
- **Repo:** `jencarlosmoral3-max/taxi-24-septiembre` (privado; movido desde `JoseluisLarrazabal/taxi-24-septiembre`, que sigue existiendo como `old-origin`). Para `gh`: `GH_TOKEN=$(gh auth token --user jencarlosmoral3-max) gh ...`.
- **Figma:** [Taxi 24 — App (MVP)](https://www.figma.com/design/5qJ0oo6BIxxdfIrrZdTDEC), 3 páginas por plan Starter.
- **Linear:** team `IND`, proyecto `P-IND-4` "App Taxi 24 de Septiembre — MVP" (8 milestones, 70 issues, 3 documentos).

## Estado
- F-03: monorepo pnpm (`apps/mobile` Expo SDK 58 + Expo Router, `apps/admin` Next.js 16, `supabase/` CLI 3.4.0 con test pgTAP de humo) y CI (`typecheck`, `lint`, `build-admin`, `db-test`). Verificado local: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `supabase db start && supabase test db` → PASS. CI verde en GitHub (run 45741295745, PR #3). Falta branch protection (bloqueada por plan).
- D-01 hecho en Figma: colecciones `Color` (12) y `Dimension` (14), 9 estilos de texto Poppins, portada y muestra de tokens. Contraste en `docs/arte.md`.
- Docs: [arte](arte.md) · [arquitectura](arquitectura.md) · [pantallas](pantallas.md) · [backlog](backlog.md) · [decisiones](decisiones.md).
- Council de stack: `~/.council/taxi-24-septiembre/council-20261126-015521/viewer.html` (fuera del repo; la síntesis está en `docs/arquitectura.md` y `docs/decisiones.md`).
- Figma de referencia (solo lectura, mockups rasterizados): RideNow `p5MfDAHjxVnJ9WHjzTawgG`, Uber Free UI Kit `bqOLw7tHsh3rjvzXZRemhh`.

## Decisiones
Ver [`docs/decisiones.md`](decisiones.md). Resumen: app independiente, Figma primero, puja tipo inDrive, solo efectivo, Expo + Supabase sa-east-1 + Next.js.

## No verificado
- Capacidad del equipo (sin fechas ni estimaciones en Linear).
- Costos reales de Google Places/Routes. OTP descartado en el piloto (login con Google).
- Codex no opinó en el council (error de la CLI): la validación del stack es de 2 de 3 voces.
- GPS en segundo plano en Android gama baja: pendiente spike F-06 (requiere teléfonos reales y Supabase).
- Branch protection: no disponible en plan Free con repo privado (403). Sin checks requeridos, cada merge pide confirmación del CTO.
- Mobile `typecheck` es `tsc --noEmit` con `typedRoutes` activo: los tipos de rutas (`.expo/types`) no se generan en CI. Hoy pasa en clon limpio; revisar en P-01 al agregar navegación tipada.
- Supabase CLI 3.4.0 genera `supabase/config.jsonc` (no `config.toml`).
- Figma: montos usan tabular-nums en código; el estilo de Figma no fija la feature OpenType.

## Registro de planes cerrados
- 2026-11-25 · Planificación MVP — resultado: docs + Linear cargado.
