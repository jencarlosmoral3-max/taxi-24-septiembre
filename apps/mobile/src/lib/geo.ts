import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Place } from '@/store/tripDraft';

// Debe coincidir con BBOX de supabase/functions/geo/lib.ts (area de servicio: Santa Cruz metro).
export const SERVICE_BBOX = { minLng: -63.4, maxLng: -62.95, minLat: -18.05, maxLat: -17.55 };

const inBolivia = (b: { lat: number; lng: number }) => b.lat >= -23 && b.lat <= -9 && b.lng >= -70 && b.lng <= -57;

export type GeoPlace = Place & { id: string };

export async function geoSearch(q: string, bias: { lat: number; lng: number } | null): Promise<GeoPlace[]> {
  const { data, error } = await supabase.functions.invoke('geo', { body: { op: 'search', q, ...(bias && inBolivia(bias) ? bias : {}) } });
  if (error) throw error;
  return (data as { places: GeoPlace[] }).places;
}

export async function geoReverse(lat: number, lng: number): Promise<{ name: string; address: string }> {
  const { data, error } = await supabase.functions.invoke('geo', { body: { op: 'reverse', lat, lng } });
  if (error) throw error;
  return data as { name: string; address: string };
}

export const httpStatus = (e: unknown) => (e instanceof FunctionsHttpError ? (e.context as Response).status : undefined);
