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

## 2026-11-25 · Nombre, merge automático, Supabase, OTP y GPS
| Decisión | Quién / por qué | Evidencia | Cómo revertir |
|---|---|---|---|
| Nombre **Vyro** y logo = wordmark "Vyro" (se descartan NEXGO, CRUZGO, MOVO, ZIPP) | CTO en sesión (cierra F-01 / IND-1) | Imagen "Modern App Logo Grid.png" enviada por el CTO; recortes en `assets/brand/` | Cambiar nombre en `app.json`, admin y docs |
| Merge automático de PRs con CI verde | CTO: "de ahora en adelante, puedes mergear todo automáticamente si pasan CI" | Mensaje del CTO | El CTO lo revoca; se vuelve a pedir confirmación por merge |
| Borrar repo viejo `JoseluisLarrazabal/taxi-24-septiembre` | CTO lo pidió | `gh repo delete` devolvió 403: falta el scope `delete_repo` | Irreversible una vez hecho. Pendiente: el CTO corre `gh auth refresh -h github.com -s delete_repo` |
| Spike GPS (F-06) arranca en el emulador local | CTO: "puedes usar el emulador de aquí" | — | El emulador valida el código (foreground service, task, envío). **No** reproduce el ahorro de batería de Xiaomi/Tecno/Samsung, que era el riesgo principal: la prueba en un teléfono gama baja real sigue pendiente antes del go/no-go |
| Figma: el seat Collab (US$3/mes) **no** sirve para el MCP | La doc de límites de Figma da a View/Collab 20 llamadas/mes, lo mismo que Starter. Dev seat (US$12/mes, Professional) o Full (US$16/mes) dan 200/día y 10/min | figma.com/pricing y developers.figma.com/docs/figma-mcp-server/rate-limits-access (leídos 2026-11-25) | — |
| Twilio cuesta: Verify US$0.05 por verificación exitosa + canal. SMS a Bolivia US$0.2215 por segmento (≈ US$0.27 por OTP). WhatsApp: US$0.05 + US$0.005 Twilio + tarifa Meta de autenticación para Bolivia (no verificada; región "Rest of Latin America") | Precios de twilio.com leídos 2026-11-25 | twilio.com/en-us/verify/pricing, /sms/pricing/bo, /whatsapp/pricing | En desarrollo se usan números de prueba de Supabase Auth (OTP fijo, sin costo) |
| **Sin Figma**: el diseño sigue directo en código (React Native y Next.js). Aprobados como spec la paleta y contraste (`docs/arte.md`), los 18 íconos Lucide, la tipografía y el inventario de componentes de D-02 | CTO: "seguimos sin figma entonces, pero apruebo la paleta de colores, íconos y todo lo que estabas pasando a figma". Reemplaza "Figma primero": el código puede arrancar | Mensaje del CTO 2026-11-25 | Volver a Figma con Dev seat (US$12/mes) |
| Schema B-01 endurecido tras review Opus (SHIP WITH FIXES): privilegios en cero por defecto, sin `profiles.phone`, oferta aceptada única, checks de estado, trigger anti-oferta tardía, anonimizar sin borrar `auth.users` con FKs `restrict` | Chairman, aplicando la review | Review en sesión 2026-11-25; tests pgTAP | Migración nueva que revierta cada punto |
| RLS B-02: acceso por relación (partes del viaje siempre; puja solo con oferta activa/expirada sobre pedido abierto), helpers que devuelven ids (una evaluación por consulta), grants por columna explícitos, admin solo por `app_metadata`, teléfono solo por `get_ride_contact`. Nº interno único solo entre aprobados; máx. 2 vehículos por conductor pendiente | Chairman, tras review Opus (SHIP WITH FIXES) y /security-review (sin hallazgos) | 104 tests pgTAP | Migración que revierta |
| Spike GPS F-06 en emulador: foreground service sobrevive pantalla apagada, Doze forzado y swipe de recientes (88–100 % de puntos, gap máx 6 s). Go/no-go provisional: go en código; pendiente 2 h en teléfono gama baja real | Chairman | `docs/spike-gps.md` | Plan B Transistorsoft si falla en teléfono real |

Costos: ninguno aprobado todavía. Pendiente F-02 (Twilio, Google Maps Platform, Supabase Pro, Google Play).
No verificado: capacidad del equipo (sin fechas), costo real de SMS a Bolivia, calidad de Google Places en Santa Cruz.
