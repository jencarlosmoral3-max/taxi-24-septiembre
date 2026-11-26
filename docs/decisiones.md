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

Costos: ninguno aprobado todavía. Pendiente F-02 (Twilio, Google Maps Platform, Supabase Pro, Google Play).
No verificado: capacidad del equipo (sin fechas), costo real de SMS a Bolivia, calidad de Google Places en Santa Cruz.
