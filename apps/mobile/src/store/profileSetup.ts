import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Fase 1 (demo): el nombre solo vive en el dispositivo; no se envia al backend.
type ProfileSetup = { done: boolean; name: string; hydrated: boolean; finish: (name?: string) => void; reset: () => void };

export const useProfileSetup = create<ProfileSetup>()(
  persist(
    (set) => ({ done: false, name: '', hydrated: false, finish: (name = '') => set({ done: true, name }), reset: () => set({ done: false, name: '' }) }),
    {
      name: 'profile-setup',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ done: s.done, name: s.name }),
      onRehydrateStorage: () => () => useProfileSetup.setState({ hydrated: true }),
    },
  ),
);
