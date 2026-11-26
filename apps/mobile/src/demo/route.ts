// Fase 1 (demo): ruta y maniobras de ejemplo, Equipetrol -> Ventura Mall. Se borra en fase 2.
// shortcut: geometria y pasos pegados de una consulta unica a OSRM publico (simplificada); en fase 2 salen de la op `route` del Edge Function geo (hoy solo devuelve distancia y duracion).
import type { LngLat } from '@maplibre/maplibre-react-native';

import { DEMO_REQUEST } from './data';


export const DEMO_ROUTE: LngLat[] = [
  [-63.19690, -17.76530],
  [-63.19688, -17.76532],
  [-63.19634, -17.76499],
  [-63.19622, -17.76493],
  [-63.19612, -17.76489],
  [-63.19602, -17.76489],
  [-63.19596, -17.76492],
  [-63.19590, -17.76493],
  [-63.19581, -17.76492],
  [-63.19573, -17.76489],
  [-63.19567, -17.76484],
  [-63.19562, -17.76476],
  [-63.19561, -17.76468],
  [-63.19558, -17.76460],
  [-63.19556, -17.76456],
  [-63.19538, -17.76434],
  [-63.19393, -17.76358],
  [-63.19291, -17.76305],
  [-63.19240, -17.76274],
  [-63.19209, -17.76247],
  [-63.19200, -17.76242],
  [-63.19173, -17.76233],
  [-63.19162, -17.76233],
  [-63.19150, -17.76232],
  [-63.19111, -17.76228],
  [-63.19081, -17.76216],
  [-63.19046, -17.76203],
  [-63.18864, -17.76138],
  [-63.18792, -17.76111],
  [-63.18785, -17.76110],
  [-63.18769, -17.76110],
  [-63.18762, -17.76111],
  [-63.18751, -17.76114],
  [-63.18744, -17.76117],
  [-63.18738, -17.76119],
  [-63.18730, -17.76118],
  [-63.18722, -17.76116],
  [-63.18715, -17.76112],
  [-63.18710, -17.76106],
  [-63.18706, -17.76098],
  [-63.18694, -17.76088],
  [-63.18677, -17.76080],
  [-63.18615, -17.76064],
  [-63.18297, -17.75999],
  [-63.18155, -17.75981],
  [-63.17956, -17.75969],
  [-63.17916, -17.75965],
  [-63.17880, -17.75963],
  [-63.17848, -17.75960],
  [-63.17815, -17.75955],
  [-63.17730, -17.75951],
  [-63.17692, -17.75950],
  [-63.17643, -17.75950],
  [-63.17586, -17.75950],
  [-63.17531, -17.75953],
  [-63.17524, -17.75954],
  [-63.17513, -17.75959],
  [-63.17510, -17.75962],
  [-63.17507, -17.75969],
  [-63.17502, -17.75976],
  [-63.17496, -17.75981],
  [-63.17489, -17.75983],
  [-63.17481, -17.75984],
  [-63.17473, -17.75983],
  [-63.17465, -17.75980],
  [-63.17459, -17.75975],
  [-63.17454, -17.75968],
  [-63.17445, -17.75962],
  [-63.17439, -17.75960],
  [-63.17433, -17.75959],
  [-63.17353, -17.75965],
  [-63.17272, -17.75973],
  [-63.17218, -17.75980],
  [-63.17161, -17.75988],
  [-63.17019, -17.76015],
  [-63.16955, -17.76029],
  [-63.16901, -17.76043],
  [-63.16794, -17.76075],
  [-63.16788, -17.76080],
  [-63.16781, -17.76088],
  [-63.16774, -17.76100],
  [-63.16769, -17.76106],
  [-63.16761, -17.76111],
  [-63.16752, -17.76112],
  [-63.16744, -17.76112],
  [-63.16736, -17.76108],
  [-63.16728, -17.76102],
  [-63.16724, -17.76096],
  [-63.16722, -17.76090],
  [-63.16722, -17.76083],
  [-63.16724, -17.76077],
  [-63.16725, -17.76073],
  [-63.16727, -17.76059],
  [-63.16727, -17.76054],
  [-63.16725, -17.76049],
  [-63.16687, -17.75948],
  [-63.16640, -17.75831],
  [-63.16578, -17.75669],
  [-63.16553, -17.75606],
  [-63.16421, -17.75267],
  [-63.16415, -17.75252],
  [-63.16409, -17.75243],
  [-63.16402, -17.75237],
  [-63.16382, -17.75228],
  [-63.16370, -17.75223],
  [-63.16354, -17.75219],
  [-63.16340, -17.75218],
  [-63.16322, -17.75217],
  [-63.16303, -17.75219],
  [-63.16225, -17.75245],
  [-63.16116, -17.75289],
  [-63.16026, -17.75330],
  [-63.15940, -17.75373],
  [-63.15925, -17.75345],
  [-63.15866, -17.75226],
  [-63.15836, -17.75169],
  [-63.15790, -17.75098],
  [-63.15765, -17.75062],
  [-63.15823, -17.75033],
  [-63.15751, -17.74927],
  [-63.15730, -17.74940],
];

export type Maneuver = { at: number; icon: 'arrow-up' | 'arrow-left' | 'arrow-right' | 'rotate-right' | 'arrow-top-left' | 'arrow-top-right' | 'flag-checkered'; text: string; street: string };

// `at` = indice de DEMO_ROUTE donde ocurre la maniobra.
export const DEMO_MANEUVERS: Maneuver[] = [
  { at: 15, icon: 'arrow-top-right', text: 'Gira ligeramente a la derecha', street: 'Avenida Noel Kempff Mercado' },
  { at: 39, icon: 'arrow-top-right', text: 'Mantente a la derecha', street: 'Avenida Noel Kempff Mercado' },
  { at: 46, icon: 'arrow-up', text: 'Sigue recto', street: 'Tercer Anillo Interno' },
  { at: 66, icon: 'arrow-top-right', text: 'Mantente a la derecha', street: 'Tercer Anillo Interno' },
  { at: 91, icon: 'arrow-top-right', text: 'Mantente a la derecha', street: 'Avenida Alemania' },
  { at: 104, icon: 'arrow-up', text: 'Sal de la rotonda', street: 'Avenida Cuarto Anillo' },
  { at: 112, icon: 'arrow-left', text: 'Gira a la izquierda', street: 'Calle Cordecruz' },
  { at: 117, icon: 'arrow-left', text: 'Gira a la izquierda', street: 'Calle 5 Oeste' },
  { at: 118, icon: 'arrow-right', text: 'Gira a la derecha', street: 'Calle Las Gemelas' },
  { at: 120, icon: 'flag-checkered', text: 'Llegas a tu destino', street: 'Ventura Mall' },
];

// Del conductor (cerca de Equipetrol) al origen.
export const DEMO_PICKUP_ROUTE: LngLat[] = [
  [-63.20120, -17.76880],
  [-63.20117, -17.76882],
  [-63.20161, -17.76945],
  [-63.20177, -17.76971],
  [-63.20179, -17.76974],
  [-63.20179, -17.76984],
  [-63.20203, -17.77029],
  [-63.20202, -17.77033],
  [-63.20199, -17.77037],
  [-63.20185, -17.77006],
  [-63.20173, -17.76984],
  [-63.20123, -17.76903],
  [-63.20105, -17.76878],
  [-63.20088, -17.76857],
  [-63.20061, -17.76828],
  [-63.20023, -17.76793],
  [-63.19985, -17.76759],
  [-63.19933, -17.76716],
  [-63.19822, -17.76629],
  [-63.19741, -17.76568],
  [-63.19710, -17.76546],
  [-63.19688, -17.76532],
  [-63.19690, -17.76530],
];

const rad = (d: number) => (d * Math.PI) / 180;
export function meters(a: LngLat, b: LngLat): number {
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}

// Acumulado en metros hasta cada punto de la ruta.
export const ROUTE_CUM = DEMO_ROUTE.reduce<number[]>((acc, p, i) => [...acc, i ? acc[i - 1] + meters(DEMO_ROUTE[i - 1], p) : 0], []);
export const ROUTE_METERS = ROUTE_CUM[ROUTE_CUM.length - 1];

// DEMO_ROUTE debe ir de DEMO_REQUEST.pickup a DEMO_REQUEST.dropoff; si cambia el pedido demo, hay que regenerar la ruta.
if (__DEV__) {
  const { pickup, dropoff } = DEMO_REQUEST;
  console.assert(meters(DEMO_ROUTE[0], [pickup.lng, pickup.lat]) < 100, 'DEMO_ROUTE no empieza en el pickup del pedido demo');
  console.assert(meters(DEMO_ROUTE[DEMO_ROUTE.length - 1], [dropoff.lng, dropoff.lat]) < 100, 'DEMO_ROUTE no termina en el dropoff del pedido demo');
}

// Rumbo en grados (0 = norte) de a hacia b.
function heading(a: LngLat, b: LngLat): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Posicion tras recorrer `m` metros: punto, rumbo del tramo y indice del siguiente punto de la ruta.
export function pointAt(m: number): { pos: LngLat; bearing: number; next: number } {
  const d = Math.min(Math.max(m, 0), ROUTE_METERS);
  let next = ROUTE_CUM.findIndex((c) => c >= d);
  if (next <= 0) next = 1;
  const a = DEMO_ROUTE[next - 1];
  const b = DEMO_ROUTE[next];
  const t = (d - ROUTE_CUM[next - 1]) / (ROUTE_CUM[next] - ROUTE_CUM[next - 1]);
  return { pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], bearing: heading(a, b), next };
}
