// SPIKE F-06: codigo desechable, se reemplaza en C-03. No usar en pantallas reales.
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const TASK = 'spike-gps';
const FILE = `${FileSystem.documentDirectory}spike-gps.json`;
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export type SpikeState = { seq: number; sent: number; failed: number; phase: string };
const empty: SpikeState = { seq: 0, sent: 0, failed: 0, phase: 'dev' };

export async function readState(): Promise<SpikeState> {
  try {
    return { ...empty, ...JSON.parse(await FileSystem.readAsStringAsync(FILE)) };
  } catch {
    return empty;
  }
}

export const writeState = (s: SpikeState) => FileSystem.writeAsStringAsync(FILE, JSON.stringify(s));

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data) return;
  const s = await readState();
  for (const l of data.locations) {
    s.seq += 1;
    try {
      const r = await fetch(`${URL}/spike_gps_points`, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          device: 'emu',
          phase: s.phase,
          seq: s.seq,
          recorded_at: new Date(l.timestamp).toISOString(),
          lat: l.coords.latitude,
          lng: l.coords.longitude,
          accuracy: l.coords.accuracy,
        }),
      });
      if (r.ok) s.sent += 1;
      else s.failed += 1;
    } catch {
      s.failed += 1;
    }
  }
  await writeState(s);
});
