# Dirección de arte — App Taxi 24 de Septiembre

Estado: aprobado como dirección inicial (plan aprobado por el CTO el 2026-11-25). Nombre comercial y logo pendientes del sindicato; placeholder **"Taxi 24"**.

## Concepto
"El taxi del sindicato: confiable y local." Interfaz oscura con amarillo taxi como color de acción. El verde cruceño marca los estados positivos (en línea, aceptado, viaje completado).

## Archivo Figma
[Taxi 24 — App (MVP)](https://www.figma.com/design/5qJ0oo6BIxxdfIrrZdTDEC) (D-01). La cuenta Figma es plan Starter, que permite **3 páginas**, así que la estructura es:
- **Fundamentos:** portada, tokens (muestra de color, tipografía y contraste) y, desde D-02, componentes.
- **App móvil:** secciones Común, Pasajero y Conductor, más el prototipo navegable.
- **Admin web:** panel del sindicato.

Variables: colección `Color` (modo `Dark`, 12 tokens `color/*`) y colección `Dimension` (`spacing/2xs…3xl` = 4/8/12/16/20/24/32/40/48, `radius/input|card|pill` = 12/16/999, `size/touch-min` 48, `size/cta-height` 56). Code syntax WEB `var(--color-bg)` etc. para el admin. Estilos de texto Poppins: `Title/24|20|18`, `Body/16`, `Body/16 Medium`, `Body/14`, `Body/14 Medium`, `Amount/32|20`.

## Referencias
- Figma `RideNow` (community): paleta oscura + amarillo y flujos pasajero/conductor. Son mockups rasterizados; solo sirven como referencia.
- Figma `Uber Free UI Kit` (community): referencia del flujo de onboarding (teléfono → OTP → datos).
- No se copian ilustraciones, marca ni assets de esos archivos.

## Paleta (tokens)
| Token | Hex | Uso |
|---|---|---|
| `bg` | `#191919` | fondo de app |
| `surface` | `#242424` | cards, bottom sheets |
| `surface-2` | `#2E2E2E` | inputs, chips, filas |
| `border` | `#3A3A3A` | divisores, bordes de input |
| `primary` | `#F6C200` | CTA, selección, marcador propio |
| `on-primary` | `#191919` | texto sobre amarillo |
| `danger` | `#FF3B30` | texto/ícono de rechazar, cancelar, SOS sobre fondo oscuro |
| `danger-strong` | `#D92D20` | fondo de botón peligro/SOS con texto blanco |
| `success` | `#1FA05A` | texto/ícono en línea, aceptado, completado sobre fondo oscuro |
| `success-strong` | `#178048` | fondo de botón/estado positivo con texto blanco |
| `text` | `#FFFFFF` | texto principal |
| `text-muted` | `#A6A6A6` | texto secundario, placeholders |

`#F6C200` y `#191919` se muestrearon del Figma RideNow.

### Contraste (WCAG 2.x, verificado 2026-11-25 en D-01)
| Par | Ratio | AA texto normal (4.5) |
|---|---|---|
| `text` sobre `bg` | 17.58 | sí |
| `text-muted` sobre `bg` / `surface` / `surface-2` | 7.22 / 6.38 / 5.58 | sí |
| `on-primary` sobre `primary` | 10.58 | sí |
| `danger` sobre `bg` | 4.96 | sí |
| `success` sobre `bg` | 5.22 | sí |
| blanco sobre `danger` | 3.55 | **no** (solo texto grande) |
| blanco sobre `success` | 3.37 | **no** (solo texto grande) |
| blanco sobre `danger-strong` | 4.83 | sí |
| blanco sobre `success-strong` | 4.98 | sí |

Regla: `danger`/`success` nunca como fondo de texto blanco; para rellenos se usan las variantes `-strong`.

## Tipografía
Poppins. Títulos 600 (24/20/18), cuerpo 400–500 (16/14), montos en Bs 600 tabular. Escala mínima de texto 14 por legibilidad en movimiento.

## Forma y espaciado
- Radios: 16 cards/sheets · 12 inputs · pill (999) botones y chips.
- CTA principal: full-width, alto 56, amarillo.
- Targets táctiles ≥ 48 (conductores usan la app con el auto en marcha).
- Grilla de 4 px; padding de pantalla 20.

## Iconos e ilustración
- Un solo set lineal (Lucide o Phosphor vía Iconify), trazo 1.75.
- Ilustraciones propias para onboarding y estados vacíos: taxi amarillo, ciudad de Santa Cruz (catedral, Cristo Redentor, el 4° anillo). Se generan en M1.

## Mapa
Google Maps con estilo oscuro custom JSON alineado a la paleta: calles `#2E2E2E`, agua apagada, POIs ocultos salvo transporte. Marcadores: pasajero amarillo, conductor ícono de taxi, destino verde.

## Reglas
- Solo modo oscuro en el MVP.
- Contraste AA mínimo para todo texto. El caso difícil es el sol directo: probar en un teléfono real afuera.
- El amarillo se reserva para la acción principal de la pantalla (una sola por vista).
