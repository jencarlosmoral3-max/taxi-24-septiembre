import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// locationAsked: el usuario ya descarto la explicacion de ubicacion (por dispositivo, sobrevive al cierre de sesion).
type Onboarding = { seen: boolean; locationAsked: boolean; hydrated: boolean; markSeen: () => void; markLocationAsked: () => void };

export const useOnboarding = create<Onboarding>()(
  persist(
    (set) => ({ seen: false, locationAsked: false, hydrated: false, markSeen: () => set({ seen: true }), markLocationAsked: () => set({ locationAsked: true }) }),
    {
      name: 'onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seen: s.seen, locationAsked: s.locationAsked }),
      onRehydrateStorage: () => () => useOnboarding.setState({ hydrated: true }),
    },
  ),
);
