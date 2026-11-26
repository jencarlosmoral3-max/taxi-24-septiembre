// Fase 1 (demo): datos extra del conductor. Se borra en fase 2 (plan-pantallas.md).
import { PLACES } from './data';

// Numeros de ejemplo: NO son reales. En fase 2 vienen de app_config / get_ride_contact.
export const UNION_WHATSAPP = '59100000000';
export const DEMO_PASSENGER_PHONE = '+59170000000';

// Base de las ganancias del store (DEMO_EARNINGS.today): estos viajes suman Bs 185 en 7 viajes.
export const TODAY_BASE = { cents: 18500, trips: 7 };
export const DEMO_TODAY_TRIPS = [
  { id: 't1', time: '07:40', from: PLACES.plan3000.name, to: PLACES.plaza.name, cents: 1500 },
  { id: 't2', time: '08:25', from: PLACES.plaza.name, to: PLACES.cristo.name, cents: 1800 },
  { id: 't3', time: '09:50', from: PLACES.ventura.name, to: PLACES.plan3000.name, cents: 3500 },
  { id: 't4', time: '11:10', from: PLACES.equipetrol.name, to: PLACES.plaza.name, cents: 2000 },
  { id: 't5', time: '12:35', from: PLACES.cristo.name, to: PLACES.equipetrol.name, cents: 2500 },
  { id: 't6', time: '14:05', from: PLACES.plaza.name, to: PLACES.ventura.name, cents: 4200 },
  { id: 't7', time: '15:30', from: PLACES.ventura.name, to: PLACES.cristo.name, cents: 3000 },
] as const;

// Dias previos de la semana (suman Bs 755 en 34 viajes; con hoy dan los Bs 940 / 41 de DEMO_EARNINGS.week).
export const DEMO_WEEK_PREVIOUS_DAYS = [
  { label: 'Ayer', trips: 6, cents: 12000 },
  { label: 'Hace 2 días', trips: 5, cents: 11000 },
  { label: 'Hace 3 días', trips: 7, cents: 15000 },
  { label: 'Hace 4 días', trips: 6, cents: 13500 },
  { label: 'Hace 5 días', trips: 5, cents: 11000 },
  { label: 'Hace 6 días', trips: 5, cents: 13000 },
] as const;
