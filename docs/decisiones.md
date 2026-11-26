# Registro de decisiones

## 2026-11-25 · Planificación del MVP
Aprobado por: CTO (en sesión con Claude, plan `docs/plan-planificacion-mvp.md`).

| Decisión | Por qué | Cómo revertir |
|---|---|---|
| App **independiente** de QUIVO Control | Elección del CTO: producto propio del sindicato, sin acoplarse al roadmap/piloto de QUIVO | Migrar a módulo de QUIVO más adelante (el modelo de datos es compatible a nivel conceptual) |
| **Figma primero** antes de codificar | Validar con la directiva y taxistas antes de invertir en código | — |
| Precio por **puja tipo inDrive** | Es lo que define el producto pedido | Tarifa fija = config de tarifa sugerida obligatoria |
| **Solo efectivo** en el MVP | Lo usual en taxis de Santa Cruz; evita contrato de pasarela y conciliación | QR/pasarela en V2 |
| Una sola app con modo Pasajero/Conductor | Un build, un flujo de login; conductor gated por aprobación | Separar en dos apps si el piloto lo pide |
| Stack Expo + Supabase sa-east-1 + Next.js (ver `docs/arquitectura.md`) | Recomendación del chairman; council `council-20261126-015521` (Claude + Gemini a favor, Codex falló) con ajustes: GPS por RPC en vez de Realtime, sin `postgres_changes`, OTP WhatsApp primario, push FCM, load test | Datos y lógica son Postgres estándar; reemplazar Auth/Realtime |

## 2026-11-25 · Repo, Figma y contraste (D-01)
| Decisión | Quién / por qué | Evidencia | Cómo revertir |
|---|---|---|---|
| Repo movido a `jencarlosmoral3-max/taxi-24-septiembre` (privado). Se recreó el PR #1 ahí | Pedido del CTO en sesión | `git remote -v`: `origin` nuevo, `old-origin` = `JoseluisLarrazabal/taxi-24-septiembre` | El repo viejo sigue intacto. **Borrarlo requiere confirmación del CTO** |
| Sin branch protection por ahora | GitHub responde 403 "Upgrade to GitHub Pro or make this repository public" en ambas cuentas (plan Free, repo privado) | `gh api repos/.../branches/main/protection` | CTO elige: GitHub Pro (~US$4/mes, precio no verificado hoy, no aprobado) o repo público. Mientras tanto, cada merge pide confirmación (regla 4) |
| Tokens nuevos `danger-strong #D92D20` y `success-strong #178048` | Blanco sobre `danger` (3.55) y `success` (3.37) no pasa AA; `docs/arte.md` ya decía "oscurecer" | Tabla de contraste en `docs/arte.md` | Quitar los tokens y aceptar AA solo texto grande |
| Figma con 3 páginas (Fundamentos, App móvil, Admin web) en lugar de 8 | La cuenta Figma es Starter: `createPage` falla con "The Starter plan only comes with 3 pages" | Archivo `5qJ0oo6BIxxdfIrrZdTDEC` | Plan Professional de Figma (no aprobado) y separar en páginas |
| Diseño en Figma frenado hasta decisión | El MCP de Figma devolvió "You've reached the Figma MCP tool call limit on the Starter plan". La doc (developers.figma.com/docs/figma-mcp-server/rate-limits-access) da 20 llamadas/mes en Starter y 200/día en Professional con seat Full/Dev | Error en sesión 2026-11-25 | CTO elige: plan Professional (costo no verificado, no aprobado), esperar al próximo ciclo, o diseñar a mano en Figma |

Costos: ninguno aprobado todavía. Pendiente F-02 (Twilio, Google Maps Platform, Supabase Pro, Google Play).
No verificado: capacidad del equipo (sin fechas), costo real de SMS a Bolivia, calidad de Google Places en Santa Cruz.
