// Fase 1 (demo): datos de ejemplo. Se borra en fase 2 (plan-pantallas.md).
import type { Enums } from '@vyro/db-types';
import { create } from 'zustand';

import { DEMO_OFFER_TEMPLATES, OFFER_TTL_MS, type DemoDriver, type DemoOffer } from './data';

export type RideStatus = Enums<'ride_status'> | 'idle'; // 'idle' = sin viaje

const OFFER_EVERY_MS = 2000;
const ETA_TICK_MS = 2000;
const ARRIVE_AFTER_MS = 8000;

type State = {
  status: RideStatus;
  fareCents: number | null; // tarifa ofrecida (sube con raiseFare)
  offers: DemoOffer[];
  driver: DemoDriver | null; // conductor de la oferta aceptada
  etaMin: number; // minutos hasta que llega el conductor
  finalFareCents: number | null;
  cancelReason: string | null;
  requestRide: (fareCents: number) => void;
  raiseFare: (cents: number) => void;
  acceptOffer: (offerId: string) => void;
  startRide: () => void;
  completeRide: () => void;
  cancel: (reason: string) => void;
  reset: () => void;
};

const INITIAL: Omit<State, 'requestRide' | 'raiseFare' | 'acceptOffer' | 'startRide' | 'completeRide' | 'cancel' | 'reset'> = { status: 'idle', fareCents: null, offers: [], driver: null, etaMin: 0, finalFareCents: null, cancelReason: null };

let timers: ReturnType<typeof setTimeout>[] = [];
const later = (fn: () => void, ms: number) => void timers.push(setTimeout(fn, ms));
const clearTimers = () => {
  timers.forEach(clearTimeout);
  timers = [];
};

export const useDemoRide = create<State>((set, get) => ({
  ...INITIAL,
  requestRide: (fareCents) => {
    clearTimers();
    set({ ...INITIAL, status: 'requested', fareCents });
    DEMO_OFFER_TEMPLATES.forEach((t, i) =>
      later(() => {
        const { status, fareCents: fare } = get();
        if (status !== 'requested' || fare === null) return;
        const offer: DemoOffer = {
          id: `demo-oferta-${i + 1}`,
          driver_id: t.driver.profile.id,
          price_cents: fare + t.extraCents,
          status: 'active',
          etaMin: t.etaMin,
          expiresAt: Date.now() + OFFER_TTL_MS,
        };
        set((s) => ({ offers: [...s.offers, offer] }));
        later(() => set((s) => ({ offers: s.offers.filter((o) => o.id !== offer.id) })), OFFER_TTL_MS);
      }, OFFER_EVERY_MS * (i + 1)),
    );
  },
  raiseFare: (cents) => {
    if (get().status === 'requested') set((s) => ({ fareCents: cents, offers: s.offers.filter((o) => o.price_cents >= cents) }));
  },
  acceptOffer: (offerId) => {
    const { status, offers } = get();
    const offer = offers.find((o) => o.id === offerId);
    const driver = DEMO_OFFER_TEMPLATES.find((t) => t.driver.profile.id === offer?.driver_id)?.driver;
    if (status !== 'requested' || !offer || !driver || offer.expiresAt < Date.now()) return;
    clearTimers();
    set({ status: 'assigned', driver, etaMin: offer.etaMin, finalFareCents: offer.price_cents, offers: [] });
    for (let t = ETA_TICK_MS; t < ARRIVE_AFTER_MS; t += ETA_TICK_MS) {
      later(() => set((s) => ({ etaMin: Math.max(1, s.etaMin - 1) })), t);
    }
    later(() => set({ status: 'driver_arrived', etaMin: 0 }), ARRIVE_AFTER_MS);
  },
  startRide: () => {
    if (get().status === 'driver_arrived') set({ status: 'in_progress' });
  },
  completeRide: () => {
    if (get().status === 'in_progress') set({ status: 'completed' });
  },
  cancel: (reason) => {
    if (!['requested', 'assigned', 'driver_arrived'].includes(get().status)) return;
    clearTimers();
    set({ status: 'cancelled_passenger', cancelReason: reason, offers: [] });
  },
  reset: () => {
    clearTimers();
    set(INITIAL);
  },
}));
