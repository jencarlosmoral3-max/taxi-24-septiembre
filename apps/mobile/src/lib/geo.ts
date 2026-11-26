import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Place } from '@/store/tripDraft';

export type GeoPlace = Place & { id: string };

export async function geoSearch(q: string, bias: { lat: number; lng: number } | null): Promise<GeoPlace[]> {
  const { data, error } = await supabase.functions.invoke('geo', { body: { op: 'search', q, ...bias } });
  if (error) throw error;
  return (data as { places: GeoPlace[] }).places;
}

export async function geoReverse(lat: number, lng: number): Promise<{ name: string; address: string }> {
  const { data, error } = await supabase.functions.invoke('geo', { body: { op: 'reverse', lat, lng } });
  if (error) throw error;
  return data as { name: string; address: string };
}

export const httpStatus = (e: unknown) => (e instanceof FunctionsHttpError ? (e.context as Response).status : undefined);
