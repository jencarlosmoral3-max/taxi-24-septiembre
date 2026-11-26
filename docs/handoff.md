# Handoff — App Taxi 24 de Septiembre

Documento vivo. Se actualiza al cerrar cada iteración o PR.

## Reanudación
- **Hito activo:** planificación del MVP → cerrada al mergear este PR. Siguiente: **M0 Fundamentos** + **M1 Diseño Figma**.
- **Plan:** [`docs/plan-planificacion-mvp.md`](plan-planificacion-mvp.md) (aprobado por el CTO 2026-11-25).
- **Siguiente paso concreto:** F-01 (nombre y logo con la directiva) y F-02 (aprobar costos) en paralelo con D-01 (archivo Figma + tokens). Antes de cualquier trabajo de UI se carga el skill `ui-workflow`.
- **Linear:** team `IND`, proyecto `P-IND-4` "App Taxi 24 de Septiembre — MVP" (8 milestones, 70 issues, 3 documentos).

## Estado
- Repo solo con docs, sin código.
- Docs: [arte](arte.md) · [arquitectura](arquitectura.md) · [pantallas](pantallas.md) · [backlog](backlog.md) · [decisiones](decisiones.md).
- Council de stack: `~/.council/taxi-24-septiembre/council-20261126-015521/viewer.html` (fuera del repo; la síntesis está en `docs/arquitectura.md` y `docs/decisiones.md`).
- Figma de referencia (solo lectura, mockups rasterizados): RideNow `p5MfDAHjxVnJ9WHjzTawgG`, Uber Free UI Kit `bqOLw7tHsh3rjvzXZRemhh`.

## Decisiones
Ver [`docs/decisiones.md`](decisiones.md). Resumen: app independiente, Figma primero, puja tipo inDrive, solo efectivo, Expo + Supabase sa-east-1 + Next.js.

## No verificado
- Capacidad del equipo (sin fechas ni estimaciones en Linear).
- Costos reales de OTP (WhatsApp/SMS) a Bolivia y de Google Places/Routes.
- Codex no opinó en el council (error de la CLI): la validación del stack es de 2 de 3 voces.
- GPS en segundo plano en Android gama baja: pendiente spike F-06.

## Registro de planes cerrados
- 2026-11-25 · Planificación MVP — resultado: docs + Linear cargado.
