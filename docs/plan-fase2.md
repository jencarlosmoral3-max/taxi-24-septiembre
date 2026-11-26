# Plan — Fase 2: pantallas conectadas al backend real

Estado: **propuesta, pendiente de aprobación del CTO** (redactada 2026-11-26 al cerrar la fase 1). No se ejecuta nada hasta su OK.

## Objetivo
Que pasajero y conductor hagan un viaje real entre dos teléfonos: pedido con tarifa ofrecida, ofertas en vivo, aceptación atómica, seguimiento del taxi, fin con cobro en efectivo y calificaciones. Sin datos simulados: `apps/mobile/src/demo/` se borra.

## Punto de partida
- Backend listo y con pgTAP: `create_ride`, `get_nearby_requests`, `make_offer`, `accept_offer`, `driver_arrived`, `start_ride`, `complete_ride`, `cancel_ride`, `rate_ride`, `trigger_sos`, `upsert_driver_location`, `get_ride_contact`, `get_my_driver_application`, `set_my_phone`/`get_my_phone`, `suggest_fare`, `expire_stale`; canales privados `driver:{id}`, `rider:{id}`, `trip:{id}` (B-10); `geo` v6 con ruta, tarifa sugerida y trazado.
- App: todas las pantallas de fase 1 leen de `useDemoRide` / `useDemoDriver` (`src/demo/`). Fase 2 cambia la fuente de datos, no el diseño.
- APK demo de fase 1: se conserva con el tag `demo-fase1` (commit 2a0fb4d) para mostrar mientras dura la fase 2.

## Pasos (un PR por paso, en orden)
1. **Capa de datos** — `src/lib/rides.ts` (wrappers tipados de las RPC con `@vyro/db-types`, errores mapeados a mensajes en español) y `src/lib/realtime.ts` (hook de canal privado con reconexión y limpieza). TanStack Query para lecturas; nada de `postgres_changes`.
2. **Pasajero** — tarifa sugerida desde `geo` `route` (reemplaza `suggestedFareCents` de línea recta) → `create_ride` → ofertas por `rider:{id}` → `accept_offer` → estado y posición del taxi por `trip:{id}` → llegó / en curso / fin → `rate_ride`; `cancel_ride` con motivo; `get_ride_contact` para Llamar. Reanudar un viaje activo al reabrir la app.
3. **Conductor** — registro real (insert `drivers`/`vehicles` + fotos al bucket `driver-docs`), pendiente con `get_my_driver_application`; en línea con `upsert_driver_location` en primer plano (envío adaptativo 5–15 s); pedidos por `driver:{id}` + `get_nearby_requests`; `make_offer`; llegué / iniciar / finalizar; calificar; ganancias desde sus viajes. Navegación con la geometría de `geo` (borra `src/demo/route.ts`).
4. **Aprobación de conductores** — mínimo viable: runbook SQL (`docs/runbook-admin.md`) o A-01/A-02 del panel con auth real en un host con servidor (Vercel gratis); ver decisiones.
5. **SOS real** — `trigger_sos` desde viaje en curso del pasajero y del conductor, con confirmación; aviso en el panel (A-05).
6. **Limpieza** — borrar `src/demo/`, `Placeholder.tsx` y la ruta `/dev-components` del build release; quitar o restringir la entrada de prueba anónima (las RPC ya rechazan `is_anonymous`); retirar el spike GPS (`/spike-gps`, `usesCleartextTraffic`, nota en C-03).

## Archivos críticos
`apps/mobile/src/app/{_layout,index}.tsx`, `src/app/viaje/*`, `src/app/conductor/*`, `src/lib/{geo,rides,realtime}.ts`, `src/store/{tripDraft,appMode}.ts`, `src/demo/*` (se borra), `supabase/migrations/*` (solo si falta algo; cada cambio con pgTAP).

## Trampas y decisiones abiertas
- **Riesgo sensible (regla 2):** todo PR que toque RPC, RLS, Realtime o datos personales lleva `/security-review` + review Opus.
- **Realtime remoto:** verificar "Allow public access" apagado y que `private.notify` entrega (nota B-10) antes del paso 2.
- **Pruebas E2E con dos dispositivos:** emulador como pasajero + J7 (o segundo emulador) como conductor; el conductor necesita estar aprobado.
- **Cuotas geo:** la ruta se pide una vez por viaje (caché 1 h); 100/día por usuario alcanza para pruebas.
- **Mismo teléfono en dos modos:** el cambio de modo no puede dejar un viaje activo huérfano; bloquear el cambio con viaje en curso.
- **Plan Free de Supabase:** se pausa tras ~7 días sin uso; abrir el proyecto antes de cada prueba.
- **Decide el CTO:** (a) aprobación de conductores por SQL o panel real en Vercel; (b) GPS en segundo plano (C-03) dentro de fase 2 o después; (c) push FCM (B-11) dentro de fase 2 o después: sin push, el conductor solo recibe pedidos con la app abierta.

## Verificación
- Por PR: `tsc`, `pnpm lint`, CI 5/5, gates de la regla 2.
- Paso 2 y 3: recorrido completo entre dos dispositivos con capturas (pedido → 2 ofertas → aceptar una → la otra queda rechazada → seguimiento → fin → calificaciones cruzadas), más cancelación por cada lado y expiración de ofertas.
- Al cerrar: `grep -r "src/demo" apps/mobile/src` vacío y APK release probado en el J7.
