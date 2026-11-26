# Plan · Todas las pantallas del pasajero y del conductor (demo MVP)

Estado: aprobado por el CTO en chat (2026-11-26: "implementar todas las pantallas de la app del pasajero y de la app del conductor, y luego las volvemos funcionales para la demo MVP"). Depende de P-04 mergeado.

## Objetivo
Fase 1: todas las pantallas de [`pantallas.md`](pantallas.md) (pasajero, conductor y comunes) en la app real, navegables de punta a punta con datos de ejemplo. Fase 2: conectarlas al backend que ya existe (RPCs de la puja, Realtime, GPS de flota, calificaciones, SOS) para la demo.

## Decisiones
| Tema | Decisión | Por qué |
|---|---|---|
| Datos en fase 1 | Datos de ejemplo en `src/demo/` tipados con `@vyro/db-types` (filas de tablas y retornos de RPC). Cada pantalla lee sus datos de un hook `use…` del módulo demo | En fase 2 se cambia la fuente del hook (TanStack Query + RPC/Realtime), no la pantalla. Riesgo aceptado: algo de retrabajo en pantallas que dependen de tiempo real |
| Simulación del tiempo real | El hook demo emite eventos con `setTimeout` (llegan ofertas, el conductor avanza, el pasajero acepta) | La puja se ve viva sin backend; se borra en fase 2 |
| Rutas | Pasajero en `src/app/viaje/` (`tarifa`, `esperando`, `en-camino`, `en-curso`, `fin`). Conductor en `src/app/conductor/` (`index`, `registro`, `pendiente`, `solicitud/[id]`, `esperando`, `recoger`, `en-curso`, `cobro`, `ganancias`). Comunes: `onboarding`, `perfil`, `soporte`, `historial/index`, `historial/[id]` | Una ruta por estado del viaje; Expo Router por archivos |
| Modo | `useAppMode` (ya existe) elige el home: pasajero `/`, conductor `/conductor`. Switch en `perfil`. Conductor no aprobado va a `pendiente` o `registro` según el estado de su solicitud (dato demo en fase 1, `get_my_driver_application` en fase 2) | Igual que `pantallas.md` |
| Mapa | Componente compartido `VyroMap` (estilo empaquetado, props comunes) usado por home, fijar destino y las pantallas de viaje | Hoy hay dos copias; con 6 pantallas de mapa más, se unifica |
| SOS | Botón con confirmación; en fase 1 no llama a nada. En fase 2: `trigger_sos` + marcador del 110 (`tel:110` abre el marcador, no llama) | Una demo no debe disparar alertas reales |
| Navegar (conductor) | `Linking` a Google Maps / `geo:` ya en fase 1 | Es una línea y funciona sin backend |
| Registro de conductor | 4 pasos con fotos (`expo-image-picker` si ya está instalado; si no, se evalúa antes de agregar porque exige rebuild nativo) | Subida real a Storage en fase 2 |
| Diseño | Sin bake-off: paleta, tipografía y componentes ya aprobados (`arte.md`, P-01). Ruta "pantalla puntual" del skill `ui-workflow` + gate de UI por PR | Regla 7 |

## Pasos (fase 1)
1. **Base** (Sonnet, 1 PR): `src/demo/` (datos y hooks), `VyroMap`, rutas vacías registradas en `_layout.tsx` con sus guards, switch de modo. Es la única pieza que toca `_layout.tsx`.
2. **En paralelo** (3 Sonnet, worktrees separados, 1 PR cada uno):
   - A · Pasajero: ofrecer tarifa → esperando ofertas → lista de ofertas → conductor en camino / llegó → viaje en curso + SOS → fin, pago en efectivo y calificación; cancelación con motivos.
   - B · Conductor: registro en 4 pasos → pendiente → home en línea/fuera de línea con ganancias del día → solicitud entrante con contraoferta → esperando respuesta → ir a recoger / llegué → en curso + SOS → cobro y calificar pasajero → ganancias.
   - C · Comunes: onboarding (3 slides), perfil y ajustes (switch, cerrar sesión, eliminar cuenta como pedido), soporte/FAQ (WhatsApp del sindicato), historial y detalle.
3. Por PR: `tsc` + `pnpm lint`, `/code-review` + `/ponytail-review` + gate de UI, recorrido en el emulador con capturas, `ci-merge.sh`.

## Fase 2 (después; plan propio)
Cambiar cada hook demo por RPC/Realtime: `create_ride`, `get_nearby_requests`, `make_offer`, `accept_offer`, `driver_arrived`, `start_ride`, `complete_ride`, `cancel_ride`, `rate_ride`, `trigger_sos`, `upsert_driver_location`, `get_ride_contact`, canales privados de B-10. Para la demo del conductor hace falta aprobar conductores (A-02 o SQL de semilla) y la ruta/tarifa sugerida de `geo` (Geoapify).

## Archivos críticos
`apps/mobile/src/app/_layout.tsx`, `src/app/viaje/*`, `src/app/conductor/*`, `src/demo/*`, `src/components/VyroMap.tsx`, `src/store/{appMode,tripDraft}.ts`.

## Trampas
- Paralelo: solo el paso 1 toca `_layout.tsx` y `src/demo/`; A, B y C crean archivos propios. Si un agente necesita un dato demo nuevo, lo agrega en un archivo nuevo de `src/demo/`, no edita los compartidos.
- `BottomSheet` tiene el `KeyboardAvoidingView` sin `behavior` en Android (handoff): corregirlo en el PR que lo use con input (contraoferta, tarifa).
- Nada de la simulación puede quedar activo en fase 2: todo vive en `src/demo/` y se borra.
- Conductor y pasajero en el mismo teléfono: el switch de modo no debe mezclar el viaje en curso de un modo con el otro.

## Verificación
- Emulador: recorrido completo del pasajero (destino → tarifa → ofertas → aceptar → en camino → llegó → en curso → fin y calificación) y del conductor (registro → pendiente → en línea → solicitud → contraoferta → recoger → en curso → cobro), con capturas.
- `tsc`, `pnpm lint`, CI 5/5 en cada PR.
- No verificable en fase 1: tiempo real, GPS de flota, push.
