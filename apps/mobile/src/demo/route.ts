// Fase 1 (demo): ruta y maniobras de ejemplo, Equipetrol -> Ventura Mall. Se borra en fase 2.
// shortcut: geometria y pasos a mano (aproximados, no son calles exactas); en fase 2 salen de la op `route` del Edge Function geo (hoy solo devuelve distancia y duracion).
import type { LngLat } from '@maplibre/maplibre-react-native';

import { PLACES } from './data';

const { equipetrol: A, ventura: B } = PLACES;

export const DEMO_ROUTE: LngLat[] = [
  [A.lng, A.lat],
  [-63.1955, -17.7652],
  [-63.194, -17.765],
  [-63.1925, -17.7648],
  [-63.191, -17.7646],
  [-63.1895, -17.7644],
  [-63.188, -17.7641],
  [-63.1865, -17.7639],
  [-63.185, -17.7637],
  [-63.1848, -17.7622],
  [-63.1846, -17.7608],
  [-63.1844, -17.7594],
  [-63.1842, -17.758],
  [-63.184, -17.7565],
  [-63.1838, -17.755],
  [-63.1836, -17.7536],
  [-63.1834, -17.7524],
  [-63.1815, -17.7522],
  [-63.1795, -17.752],
  [-63.1775, -17.7518],
  [-63.1755, -17.7516],
  [-63.1735, -17.7514],
  [-63.1715, -17.7512],
  [-63.1695, -17.751],
  [-63.1675, -17.7508],
  [-63.1655, -17.7506],
  [-63.1635, -17.7504],
  [-63.1615, -17.7502],
  [-63.1595, -17.75],
  [-63.1582, -17.7497],
  [B.lng, B.lat],
];

export type Maneuver = { at: number; icon: 'arrow-up' | 'arrow-top-left' | 'arrow-top-right' | 'flag-checkered'; text: string; street: string };

// `at` = indice de DEMO_ROUTE donde ocurre la maniobra.
export const DEMO_MANEUVERS: Maneuver[] = [
  { at: 8, icon: 'arrow-top-left', text: 'Gira a la izquierda', street: '3er anillo' },
  { at: 16, icon: 'arrow-top-right', text: 'Gira a la derecha', street: 'Av. Banzer' },
  { at: DEMO_ROUTE.length - 1, icon: 'flag-checkered', text: 'Llegas a tu destino', street: B.name },
];

// Del conductor (cerca de Equipetrol) al origen.
export const DEMO_PICKUP_ROUTE: LngLat[] = [
  [-63.2012, -17.7688],
  [-63.2005, -17.7678],
  [-63.1995, -17.7672],
  [-63.1985, -17.7665],
  [-63.1977, -17.7659],
  [A.lng, A.lat],
];

const rad = (d: number) => (d * Math.PI) / 180;
export function meters(a: LngLat, b: LngLat): number {
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}

// Acumulado en metros hasta cada punto de la ruta.
export const ROUTE_CUM = DEMO_ROUTE.reduce<number[]>((acc, p, i) => [...acc, i ? acc[i - 1] + meters(DEMO_ROUTE[i - 1], p) : 0], []);
export const ROUTE_METERS = ROUTE_CUM[ROUTE_CUM.length - 1];

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
