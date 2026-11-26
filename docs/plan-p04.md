# Plan P-04 · Búsqueda de destino

Estado: hecho (2026-11-26). Rama `feat/p04-destino`. Backlog: `docs/backlog.md` → P-04 (depende de P-03 y B-12).

## Objetivo
Desde el home, el pasajero elige su destino: autocompletado contra la Edge Function `geo` (Photon), recientes guardados en el teléfono, o fijando el punto en el mapa. El origen es la ubicación GPS o el punto fijado en el home. P-05 consume origen y destino.

## Decisiones
| Tema | Decisión | Por qué |
|---|---|---|
| Búsqueda | `supabase.functions.invoke('geo', { body: { op: 'search', q, lat, lng } })` con el sesgo del origen. Debounce 400 ms, mínimo 3 caracteres (CA OSM del backlog). TanStack Query (ya instalado) con caché por texto | El proxy ya valida, cachea y limita (60 llamadas / 10 min por usuario) |
| Errores | 429 → "Muchas búsquedas seguidas, espera un momento"; 502/red → "No pudimos buscar ahora"; sin resultados → sugerir "Fijar en el mapa" | Proveedores públicos sin SLA |
| Lugares guardados | **Recientes en el teléfono** (últimos 5 destinos, AsyncStorage). "Casa/Trabajo" en la nube queda fuera (necesita tabla + RLS + review de seguridad: dirección es dato personal) | PR chico; sin migración. Registrar como pendiente en el backlog |
| Fijar en el mapa | Pantalla de mapa con pin central y "Confirmar destino"; nombre por `op: 'reverse'` (si falla, "Punto en el mapa" + coordenadas) | CA "fijar en mapa" |
| Estado compartido | Store Zustand `tripDraft` (origen, destino) en `src/store/`, como `appMode.ts` | Lo usan home, búsqueda, fijar y luego P-05 |
| Origen | GPS si hay fix; si no, centro del mapa en modo pin (se vuelve a guardar desde `onRegionDidChange`, que P-03 quitó por no tener consumidor) | P-03 dejó el consumidor para P-04 |
| Home | Barra "¿A dónde vas?" abajo cuando no hay tarjeta de permiso; con destino elegido muestra el destino y "Cambiar". Sin botón de pedir (P-05) | Alcance |
| Mapa | Reusar el estilo empaquetado `assets/map/vyro-dark.json` | Igual que P-03 |

## Pasos
1. Sonnet en `.claude/worktrees/p04`: store, pantalla de búsqueda, pantalla de fijar destino, cambios en home. `tsc` + `pnpm lint`.
2. Chairman: verificar en el emulador (solo JS, sin rebuild: no hay dependencias nativas nuevas). Esto también cubre el pendiente "geo con JWT real".
3. Gates: `/code-review` + `/ponytail-review` + gate de UI (`impeccable audit`). Codex sin cuota hasta 2026-12-03.
4. PR con handoff, `ci-merge.sh`.

## Archivos críticos
`apps/mobile/src/app/index.tsx`, nuevas rutas en `src/app/` (búsqueda y fijar destino), `src/store/tripDraft.ts`, `_layout.tsx` (rutas dentro del guard con sesión y teléfono).

## Trampas
- `functions.invoke` envía el JWT de la sesión; el error HTTP llega como `FunctionsHttpError` (leer `context.status`).
- Cancelar o ignorar respuestas viejas al tipear (la query key por texto lo resuelve).
- No llamar a `geo` con menos de 3 caracteres (el proxy responde 400 y gasta cuota).
- Photon no admite `lang=es`; los nombres vienen como están en OSM.

## Verificación (criterios)
- `tsc` y `pnpm lint` en verde; CI 5/5.
- Emulador: buscar "Cristo" → resultados en Santa Cruz; elegir uno → home muestra el destino; reciente aparece al volver a buscar; fijar en mapa → nombre por reverse; 429 visible si se fuerza (opcional).

## Resultado (2026-11-26)
- Emulador: buscar "Cristo" → resultados de Santa Cruz (Av. Cristo Redentor, Rotonda Cuarto Anillo…); elegir uno → el home muestra nombre y dirección con "Cambiar"; el destino aparece en Recientes; fijar en el mapa → nombre por reverse ("Calle Murillo 18, Centro"). Cubre "geo con JWT real".
- Hallazgo: Photon y Nominatim públicos responden 403 a las IPs de Supabase Edge (logs de la función). Proveedor cambiado a Geoapify en un PR propio (`fix/geo-geoapify`, ver `decisiones.md`).
- Gates: `/code-review` (5 importantes + 3 nits), `/ponytail-review` (sin bloqueantes), gate de UI (4 must + 5 should): aplicados en `fb284b8` y vistos en el emulador (Volver, Reintentar, error en rojo, "Fijar en el mapa" arriba, chip de ayuda en el mapa). Codex: no verificado (sin cuota hasta 2026-12-03).
- No verificado: TalkBack, 429 forzado, rechazo de un punto fuera del área de servicio en pantalla, borrado de recientes al cerrar sesión en pantalla.
