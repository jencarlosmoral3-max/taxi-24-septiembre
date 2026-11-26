# Plan P-03 · Home con mapa y ubicación actual

Estado: en curso (2026-11-26). Rama `feat/p03-home-mapa`. Backlog: `docs/backlog.md` → P-03.
Investigación previa (no versionada, resumida aquí): MapLibre RN 11.5.1 + OpenFreeMap.

## Objetivo
El home (`apps/mobile/src/app/index.tsx`) pasa a ser un mapa oscuro centrado en la ubicación del usuario.
CA del backlog: funciona con permiso denegado (mensaje + fijar en mapa).

## Decisiones
| Tema | Decisión | Por qué |
|---|---|---|
| Librería | `@maplibre/maplibre-react-native` 11.5.1 (New Arch only, peer RN ≥ 0.80, expo ≥ 54) + config plugin en `app.json` | Decisión 55 de `decisiones.md`: OSM sin costo. v11 es la que soporta New Arch |
| Estilo | URL `https://tiles.openfreemap.org/styles/dark` tal cual | Verificado 200. Solo si la captura muestra contraste pobre contra `#191919`, se empaqueta una copia parcheada (colores de agua/calles/labels) como asset. No cambiar de estilo en runtime (issues #1746, #1647) |
| Atribución | La automática de MapLibre (botón "i", TileJSON: OpenFreeMap © OpenMapTiles, datos de OpenStreetMap). Nunca `attribution={false}`; que no quede tapada por overlays | Requisito de licencia ODbL |
| Ubicación | `expo-location` como **única** fuente (ya instalado). El punto del usuario es un `Marker`/`ViewAnnotation` propio, no `UserLocation`/`NativeUserLocation` | Evita dos consumidores de GPS en gama baja y el issue abierto #1756 (sensores activos) |
| Permiso | Pantalla previa dentro del home (overlay: por qué pedimos ubicación + botón "Permitir"); recién ahí `requestForegroundPermissionsAsync`. Solo foreground | Regla de Play y CA del backlog |
| Denegado | Mapa centrado en Santa Cruz (-17.7833, -63.1821, zoom 14), mensaje corto y pin fijo al centro ("fijar en mapa"). Si `canAskAgain` es false, botón "Abrir ajustes" (`Linking.openSettings`) | CA del backlog |
| Punto fijado | Se lee de `onRegionDidChange` (centro del mapa) y queda en estado local; P-04/P-05 lo consumen después | Sin store nuevo hasta que alguien lo use |
| Fuera de alcance | Búsqueda de destino (P-04), "¿A dónde vas?", offline, mapa del conductor | Issues propios |

## Pasos
1. Sonnet en `.claude/worktrees/p03`: instalar la lib, plugin en `app.json`, reescribir `index.tsx` (mantener "Cerrar sesión" y el link dev), componente de mapa en `src/components/` si el home queda largo. `tsc` + `pnpm lint`.
2. Chairman: build nativo local (emulador apagado durante gradle; comandos en el handoff, "Build local del dev APK").
3. Verificar en el emulador: permiso concedido con `adb emu geo fix -63.1821 -17.7833`; permiso denegado (`pm revoke`), denegado permanente; atribución visible; contraste del estilo; error de tiles (modo avión) con mensaje.
4. Gates: `/code-review` + `/ponytail-review` + gate de UI (`ui-workflow`: impeccable audit). Codex sin cuota hasta 2026-12-03.
5. PR con handoff, `ci-merge.sh`.

## Archivos críticos
`apps/mobile/package.json`, `apps/mobile/app.json`, `apps/mobile/src/app/index.tsx`, `src/components/index.ts`, `pnpm-lock.yaml`.

## Trampas
- `expo prebuild` borra `android/local.properties`: exportar `ANDROID_HOME`.
- Lib no corre en Expo Go; solo dev client.
- Issues abiertos: #1697/#1715 crash al recargar en dev (módulo location: no lo usamos), #1722 NPE en MLRNLayer, quirks de `Marker` en Android (#1729/#1700/#1618). Si el marker falla, `ViewAnnotation` o un `CircleLayer` con GeoJSON.
- Tiles con maxzoom 14 (sobre-zoom vectorial, se ve bien).
- Un solo host de tiles, sin SLA: necesita UI de error.

## Verificación (criterios)
- `tsc --noEmit` y `pnpm lint` en verde; CI 5/5.
- Capturas en emulador: concedido (punto amarillo en Santa Cruz), denegado (mensaje + pin), atribución visible.
- Delta de tamaño del APK medido (estimado 4–6 MB por ABI, no medido).
