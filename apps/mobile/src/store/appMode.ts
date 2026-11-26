import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppMode = 'passenger' | 'driver';

type AppModeState = { mode: AppMode; hydrated: boolean; setMode: (m: AppMode) => void };

// Persistido: la app reabre en el mismo modo.
export const useAppMode = create<AppModeState>()(
  persist(
    (set) => ({ mode: 'passenger', hydrated: false, setMode: (mode) => set({ mode }) }),
    {
      name: 'app-mode',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => () => useAppMode.setState({ hydrated: true }),
    },
  ),
);
