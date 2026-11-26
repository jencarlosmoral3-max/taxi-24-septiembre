# Plan — Spike GPS en segundo plano (F-06 / IND-6)

Estado: en curso (2026-11-25). El CTO autorizó usar el emulador local.

## Objetivo
Medir si `expo-location` + `expo-task-manager` con foreground service entregan una posición cada 5 s a Supabase con la app en segundo plano, la pantalla apagada y el teléfono en Doze. Resultado: % de puntos recibidos sobre los esperados.

## Alcance y límite
- El emulador (AVD `quivo_trufi3`, Android 14, Google APIs) valida el **código**: permisos, foreground service, task en segundo plano, envío y reintentos, Doze forzado por `adb`.
- El emulador **no** reproduce el ahorro de batería de fabricantes (Xiaomi MIUI/HyperOS, Tecno HiOS, Samsung One UI), que es el riesgo principal. El go/no-go final necesita además 2 h en un teléfono gama baja real.

## Pasos
1. `supabase/spikes/gps_spike.sql` (fuera de `migrations/`, nunca llega a producción): tabla `spike_gps_points` (device, seq, recorded_at, received_at, lat, lng, accuracy) con insert para `anon`. Se aplica con `psql` al Supabase local.
2. App: dependencias `expo-location` y `expo-task-manager` (`npx expo install`). Plugin de `expo-location` con background location y foreground service en `app.json`. Ruta solo de desarrollo `src/app/spike-gps.tsx` y task en `src/spike/gps-task.ts`: `startLocationUpdatesAsync` cada 5 s, notificación del foreground service, `seq` persistido, `fetch` al REST local (`http://10.0.2.2:54321`).
3. Build de desarrollo con `npx expo run:android` (carpeta `android/` generada, ignorada en git).
4. Prueba en emulador, con ruta simulada por `adb emu geo fix` (Santa Cruz): (a) primer plano 5 min, (b) app en segundo plano y pantalla apagada 10 min, (c) Doze forzado (`dumpsys deviceidle force-idle`) 10 min, (d) app quitada de recientes 5 min.
5. Resultados en `docs/spike-gps.md`: puntos esperados vs recibidos por fase, intervalo real, latencia de envío, consumo si se puede medir. Decisión provisional y qué falta en el teléfono real.

## Archivos
`supabase/spikes/gps_spike.sql`, `apps/mobile/app.json`, `apps/mobile/package.json`, `apps/mobile/src/app/spike-gps.tsx`, `apps/mobile/src/spike/gps-task.ts`, `docs/spike-gps.md`.

## Trampas
- Android 14: el foreground service de ubicación exige `FOREGROUND_SERVICE_LOCATION` y el permiso "Permitir todo el tiempo" pedido en dos pasos.
- El código del spike no entra en las pantallas reales: se borra o se reemplaza en C-03.
- La clave anon del Supabase local es pública de desarrollo; no se usa ninguna clave remota.

## Verificación
`pnpm typecheck`, `pnpm lint`, CI verde; conteo SQL `select phase, count(*) ...` en Supabase local; capturas del emulador.
