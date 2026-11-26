import { create } from 'zustand';

export type AppMode = 'passenger' | 'driver';

export const useAppMode = create<{ mode: AppMode; setMode: (m: AppMode) => void }>((set) => ({
  mode: 'passenger',
  setMode: (mode) => set({ mode }),
}));
