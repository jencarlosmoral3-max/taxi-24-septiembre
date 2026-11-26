# Spike GPS en segundo plano (F-06 / IND-6) — resultados

Fecha: 2026-11-25. Plan: `docs/plan-spike-gps.md`. Emulador `quivo_trufi3` (Android 14, API 34, Google APIs x86_64), Expo SDK 58, `expo-location` + `expo-task-manager` con foreground service (notificación "Vyro en línea"), `timeInterval` 5000 ms, `distanceInterval` 0, accuracy High. Un `fetch` por punto a PostgREST local (`http://10.0.2.2:54321`), tabla `spike_gps_points`. Ruta simulada con `adb emu geo fix` cada 2 s (Santa Cruz, ~-63.18 / -17.78).

## Resultados (ventanas por `recorded_at`)

| Fase | Duración | Esperados | Recibidos | % | Gap medio / máx | Latencia p50 / máx |
|---|---|---|---|---|---|---|
| a) primer plano | 170 s | 34 | 34 | 100 % | 5,03 s / 5,67 s | 0,18 s / 0,19 s |
| b) HOME + pantalla apagada | 304 s | 61 | 55 | 90 % | 5,59 s / 6,00 s | 0,19 s / 0,20 s |
| c) Doze profundo forzado (batería desenchufada) | 300 s | 60 | 53 | 88 % | 5,56 s / 6,00 s | 0,19 s / 0,20 s |
| d) app quitada de recientes | 182 s | 36 | 36 | 99 % | 5,07 s / 6,00 s | 0,19 s / 0,20 s |

Duraciones menores que las del plan (3/5/5/3 min en vez de 5/10/10/5). 188 filas, 188 `seq` distintos, 0 fallos de envío.

## Observaciones
- No hubo huecos largos: el gap máximo fue 6 s. El % menor a 100 en b y c se explica por una cadencia de ~5,6 s (con pantalla apagada el proveedor entrega cada ~6 s en vez de 5 s), no por pérdida de datos.
- Doze confirmado (`deviceidle get deep` = IDLE al inicio y al final de c): la task siguió enviando.
- Notificación del foreground service visible ("Vyro en línea / Compartiendo ubicación"): `docs/img/spike-gps/notificacion.jpg`.
- Al quitar la app de recientes el proceso siguió vivo (mismo PID) y `LocationTaskService` seguía en `isForeground=true`; envió con normalidad. Esperado en AOSP con foreground service.
- Latencia de envío ~0,2 s (red local, no representativa de datos móviles).

## Problemas y notas de configuración
- `supabase start -x ...` no levanta nada si el contenedor DB ya corre; se levantó PostgREST v16.5 suelto (`docker run --network host`, contenedor `spike_gps_rest`, JWT de demo local). Por eso la URL es `http://10.0.2.2:54321/spike_gps_points` sin `/rest/v1`; con Kong real hay que anteponerlo.
- Cleartext HTTP: `expo-build-properties` con `android.usesCleartextTraffic: true`.
- Permiso en segundo plano: Android 14 lo pide en dos pasos y el segundo abre Ajustes. Se concedió con `adb shell pm grant ... ACCESS_BACKGROUND_LOCATION`; el flujo de UX de dos pasos NO se validó como lo vería un usuario.
- La fase se cambió con `run-as` (no desde la UI) para poder hacerlo con la pantalla apagada; un punto en cada frontera quedó con la etiqueta de la fase vecina, por eso las tablas usan ventanas de tiempo.
- El emulador murió una vez durante el primer build Gradle (poca RAM); se reinició.

## No cubierto (requiere teléfono real)
- **Los ahorradores de batería de fabricantes (Xiaomi MIUI/HyperOS, Tecno HiOS, Samsung One UI) NO están cubiertos por el emulador** y son el riesgo principal. Falta la prueba de 2 h en un teléfono gama baja real, con la app quitada de recientes y pantalla apagada.
- Sin reintentos ni cola offline (un fallo cuenta y se descarta); sin medición de consumo; sin iOS.
- Decisión provisional: el código y el foreground service funcionan en el emulador; go/no-go pendiente del teléfono real.

El código del spike (`src/spike/`, `src/app/spike-gps.tsx`, import en `_layout.tsx`) se elimina o reemplaza en C-03.
