# Dirección de arte — App Taxi 24 de Septiembre

Estado: aprobado como dirección inicial (plan aprobado por el CTO el 2026-11-25). Nombre comercial y logo pendientes del sindicato; placeholder **"Taxi 24"**.

## Concepto
"El taxi del sindicato: confiable y local." Interfaz oscura con amarillo taxi como color de acción. El verde cruceño marca los estados positivos (en línea, aceptado, viaje completado).

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
| `danger` | `#FF3B30` | rechazar, cancelar, SOS |
| `success` | `#1FA05A` | en línea, aceptado, completado |
| `text` | `#FFFFFF` | texto principal |
| `text-muted` | `#A6A6A6` | texto secundario, placeholders |

`#F6C200` y `#191919` se muestrearon del Figma RideNow. Texto blanco sobre `danger` y `success` → verificar AA en M1; si no pasa, oscurecer el tono.

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
