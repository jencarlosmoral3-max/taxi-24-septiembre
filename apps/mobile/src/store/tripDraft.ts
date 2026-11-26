import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Place = { name: string; address: string; lat: number; lng: number };

const MAX_RECENTS = 5;
const key = (p: Place) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;

type TripDraft = {
  origin: Place | null;
  destination: Place | null;
  recents: Place[];
  reset: () => void;
  setOrigin: (p: Place | null) => void;
  // Elegir destino tambien lo agrega a recientes (dedupe por lat/lng redondeado).
  setDestination: (p: Place | null) => void;
};

const EMPTY = { origin: null, destination: null, recents: [] };

export const useTripDraft = create<TripDraft>()(
  persist(
    (set) => ({
      origin: null,
      destination: null,
      recents: [],
      reset: () => set(EMPTY),
      setOrigin: (origin) => set({ origin }),
      setDestination: (destination) =>
        set((s) => ({
          destination,
          recents: destination ? [destination, ...s.recents.filter((r) => key(r) !== key(destination))].slice(0, MAX_RECENTS) : s.recents,
        })),
    }),
    { name: 'trip-draft', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ recents: s.recents }) },
  ),
);
