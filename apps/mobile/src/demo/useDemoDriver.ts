// Fase 1 (demo): datos de ejemplo. Se borra en fase 2 (plan-pantallas.md).
import { create } from 'zustand';

import { DEMO_EARNINGS, DEMO_REQUEST, type DemoRequest } from './data';

// 'none' = sin solicitud de conductor. 'pending' | 'approved' son valores de la enum driver_status.
export type DriverApplication = 'none' | 'pending' | 'approved';
// Estados del viaje del lado conductor; los de viaje son los de la enum ride_status.
export type DriverPhase = 'idle' | 'incoming' | 'waiting' | 'assigned' | 'driver_arrived' | 'in_progress' | 'completed';

const REQUEST_AFTER_MS = 3000;
const PASSENGER_ACCEPTS_MS = 3000;

type State = {
  application: DriverApplication;
  online: boolean;
  phase: DriverPhase;
  request: DemoRequest | null;
  offeredCents: number | null; // lo ofertado (o precio aceptado) en el viaje actual
  earnings: typeof DEMO_EARNINGS;
  submitApplication: () => void;
  approveApplication: () => void; // demo: el sindicato aprueba
  setOnline: (on: boolean) => void;
  ignore: () => void;
  offer: (cents: number) => void;
  arrived: () => void;
  start: () => void;
  finish: () => void;
  cancel: () => void;
  reset: () => void; // despues de cobrar: vuelve al home
  wipe: () => void; // cierre de sesion / cambio de modo: todo a cero
};

let timer: ReturnType<typeof setTimeout> | undefined;
const clear = () => clearTimeout(timer);

export const useDemoDriver = create<State>((set, get) => {
  const scheduleRequest = () => {
    clear();
    timer = setTimeout(() => {
      const { online, phase } = get();
      if (online && phase === 'idle') set({ phase: 'incoming', request: DEMO_REQUEST });
    }, REQUEST_AFTER_MS);
  };
  const toIdle = () => {
    clear();
    set({ phase: 'idle', request: null, offeredCents: null });
    if (get().online) scheduleRequest();
  };
  return {
    application: 'none',
    online: false,
    phase: 'idle',
    request: null,
    offeredCents: null,
    earnings: DEMO_EARNINGS,
    submitApplication: () => set({ application: 'pending' }),
    approveApplication: () => set({ application: 'approved' }),
    setOnline: (on) => {
      set({ online: on });
      if (!on) {
        if (['idle', 'incoming', 'waiting'].includes(get().phase)) toIdle();
      } else if (get().phase === 'idle') scheduleRequest();
    },
    ignore: toIdle,
    offer: (cents) => {
      if (get().phase !== 'incoming') return;
      clear();
      set({ phase: 'waiting', offeredCents: cents });
      timer = setTimeout(() => {
        if (get().phase === 'waiting') set({ phase: 'assigned' });
      }, PASSENGER_ACCEPTS_MS);
    },
    arrived: () => get().phase === 'assigned' && set({ phase: 'driver_arrived' }),
    start: () => get().phase === 'driver_arrived' && set({ phase: 'in_progress' }),
    finish: () => {
      const { phase, offeredCents, earnings } = get();
      if (phase !== 'in_progress' || offeredCents === null) return;
      const add = (e: { cents: number; trips: number }) => ({ cents: e.cents + offeredCents, trips: e.trips + 1 });
      set({ phase: 'completed', earnings: { today: add(earnings.today), week: add(earnings.week) } });
    },
    cancel: toIdle,
    reset: toIdle,
    wipe: () => {
      clear();
      set({ application: 'none', online: false, phase: 'idle', request: null, offeredCents: null, earnings: DEMO_EARNINGS });
    },
  };
});
