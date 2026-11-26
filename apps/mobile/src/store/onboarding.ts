import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type Onboarding = { seen: boolean; hydrated: boolean; markSeen: () => void };

export const useOnboarding = create<Onboarding>()(
  persist(
    (set) => ({ seen: false, hydrated: false, markSeen: () => set({ seen: true }) }),
    {
      name: 'onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seen: s.seen }),
      onRehydrateStorage: () => () => useOnboarding.setState({ hydrated: true }),
    },
  ),
);
