// Fase 1 (demo): datos de ejemplo. Se borra en fase 2 (plan-pantallas.md).
import type { Tables } from '@vyro/db-types';

import type { Place } from '@/store/tripDraft';

export type DemoProfile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'rating_avg' | 'rating_count'>;
export type DemoVehicle = Pick<Tables<'vehicles'>, 'id' | 'brand' | 'model' | 'color' | 'plate' | 'year'>;
export type DemoDriver = {
  profile: DemoProfile;
  unionNumber: NonNullable<Tables<'drivers'>['union_member_number']>; // nº interno del sindicato
  vehicle: DemoVehicle;
};
export type DemoOffer = Pick<Tables<'ride_offers'>, 'id' | 'driver_id' | 'price_cents' | 'status'> & {
  etaMin: number;
  expiresAt: number; // ms epoch; lo fija el store al llegar la oferta
};
export type DemoRequest = Pick<Tables<'rides'>, 'id' | 'origin_text' | 'destination_text' | 'offered_fare_cents' | 'passenger_count'> & {
  passenger: DemoProfile;
  distanceKm: number; // distancia del conductor al pasajero
  pickup: Place;
  dropoff: Place;
};
export type DemoTrip = Pick<Tables<'rides'>, 'id' | 'origin_text' | 'destination_text' | 'final_fare_cents' | 'status' | 'completed_at'> & {
  driver: DemoDriver;
  stars: number | null;
};

export const OFFER_TTL_MS = 45_000; // app_config.offer_ttl_s

export const PLACES = {
  plaza: { name: 'Plaza 24 de Septiembre', address: 'Centro, Santa Cruz de la Sierra', lat: -17.78338, lng: -63.18211 },
  cristo: { name: 'Cristo Redentor', address: 'Av. Cristo Redentor y 2do anillo', lat: -17.7614, lng: -63.1809 },
  ventura: { name: 'Ventura Mall', address: 'Av. Banzer y 3er anillo', lat: -17.7494, lng: -63.1573 },
  equipetrol: { name: 'Equipetrol', address: 'Av. San Martín, Equipetrol', lat: -17.7653, lng: -63.1969 },
  plan3000: { name: 'Plan 3000', address: 'Av. Che Guevara, Plan 3000', lat: -17.8242, lng: -63.1286 },
} as const satisfies Record<string, Place>;

export const DEMO_PASSENGER: DemoProfile = { id: 'demo-pasajero', full_name: 'María Fernández', rating_avg: 4.9, rating_count: 23 };

export const DEMO_DRIVERS: DemoDriver[] = [
  {
    profile: { id: 'demo-conductor-1', full_name: 'Carlos Mamani', rating_avg: 4.9, rating_count: 312 },
    unionNumber: '118',
    vehicle: { id: 'demo-veh-1', brand: 'Toyota', model: 'Corolla', color: 'Blanco', plate: '4521 KLB', year: 2016 },
  },
  {
    profile: { id: 'demo-conductor-2', full_name: 'Juan Pablo Rojas', rating_avg: 4.7, rating_count: 128 },
    unionNumber: '042',
    vehicle: { id: 'demo-veh-2', brand: 'Suzuki', model: 'Swift', color: 'Plomo', plate: '3897 FGH', year: 2014 },
  },
  {
    profile: { id: 'demo-conductor-3', full_name: 'Roberto Suárez', rating_avg: 4.8, rating_count: 204 },
    unionNumber: '207',
    vehicle: { id: 'demo-veh-3', brand: 'Nissan', model: 'Tiida', color: 'Negro', plate: '2764 BCD', year: 2012 },
  },
];

// Ofertas de un pedido: el precio se arma sobre la tarifa ofrecida (ver useDemoRide).
export const DEMO_OFFER_TEMPLATES = [
  { driver: DEMO_DRIVERS[0], extraCents: 0, etaMin: 3 },
  { driver: DEMO_DRIVERS[1], extraCents: 100, etaMin: 5 },
  { driver: DEMO_DRIVERS[2], extraCents: 200, etaMin: 7 },
] as const;

export const DEMO_REQUEST: DemoRequest = {
  id: 'demo-pedido-1',
  origin_text: PLACES.equipetrol.name,
  destination_text: PLACES.ventura.name,
  offered_fare_cents: 1800,
  passenger_count: 1,
  passenger: DEMO_PASSENGER,
  distanceKm: 0.8,
  pickup: PLACES.equipetrol,
  dropoff: PLACES.ventura,
};

export const DEMO_TRIPS: DemoTrip[] = [
  { id: 'demo-viaje-1', origin_text: PLACES.plaza.name, destination_text: PLACES.cristo.name, final_fare_cents: 1500, status: 'completed', completed_at: '2026-11-25T18:42:00-04:00', driver: DEMO_DRIVERS[0], stars: 5 },
  { id: 'demo-viaje-2', origin_text: PLACES.equipetrol.name, destination_text: PLACES.ventura.name, final_fare_cents: 1800, status: 'completed', completed_at: '2026-11-24T09:15:00-04:00', driver: DEMO_DRIVERS[1], stars: 4 },
  { id: 'demo-viaje-3', origin_text: PLACES.ventura.name, destination_text: PLACES.plan3000.name, final_fare_cents: 3500, status: 'completed', completed_at: '2026-11-22T20:05:00-04:00', driver: DEMO_DRIVERS[2], stars: 5 },
  { id: 'demo-viaje-4', origin_text: PLACES.plaza.name, destination_text: PLACES.equipetrol.name, final_fare_cents: null, status: 'cancelled_passenger', completed_at: null, driver: DEMO_DRIVERS[0], stars: null },
];

// Ganancias del conductor (centavos de Bs).
export const DEMO_EARNINGS = {
  today: { cents: 18500, trips: 7 },
  week: { cents: 94000, trips: 41 },
};
