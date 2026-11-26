// Fase 1 (demo): datos de ejemplo. Se borra en fase 2 (plan-pantallas.md).
import type { Tables } from '@vyro/db-types';

import type { DemoTrip } from './data';

// shortcut: número demo, reemplazar por el del sindicato antes del piloto
export const SUPPORT_PHONE = '59170000000';

export const FAQ = [
  { q: '¿Cómo funciona la puja?', a: 'Tú ofreces cuánto quieres pagar. Los conductores cercanos aceptan tu precio o te proponen otro. Tú eliges la oferta que más te convenga.' },
  { q: '¿Cómo pago?', a: 'En efectivo, directamente al conductor al terminar el viaje. Por ahora no hay pagos dentro de la app.' },
  { q: '¿Qué pasa si cancelo?', a: 'Puedes cancelar antes de que el conductor llegue, indicando el motivo. Cancelar muchas veces seguidas puede afectar tu calificación.' },
  { q: '¿Cómo funciona el botón SOS?', a: 'Durante el viaje, el botón SOS llama al 110 y envía una alerta al sindicato con tu ubicación. Úsalo solo en una emergencia.' },
  { q: '¿Cómo me registro como conductor?', a: 'Cambia a modo Conductor en tu perfil y completa el registro: datos, licencia, vehículo y fotos. El sindicato revisa tu solicitud y te avisa cuando esté aprobada.' },
  { q: '¿Qué pasa con mis datos y mi teléfono?', a: 'Tu teléfono solo lo ve la otra persona del viaje mientras el viaje está asignado. No lo compartimos con nadie más.' },
] as const;

export const TRIP_STATUS: Record<string, { label: string; ok: boolean }> = {
  completed: { label: 'Completado', ok: true },
  cancelled_passenger: { label: 'Cancelado', ok: false },
  cancelled_driver: { label: 'Cancelado', ok: false },
};
export const tripStatus = (s: DemoTrip['status']) => TRIP_STATUS[s] ?? { label: 'Cancelado', ok: false };

// Cancelados no tienen completed_at: cae a cancelled_at y luego created_at.
export const tripDate = (t: DemoTrip & Partial<Pick<Tables<'rides'>, 'cancelled_at' | 'created_at'>>) => t.completed_at ?? t.cancelled_at ?? t.created_at ?? null;

// Intl de Hermes puede faltar en algunos dispositivos: cae a toLocaleString.
export function formatDateTime(iso: string | null, withTime = true): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime && { hour: '2-digit', minute: '2-digit' }) }).format(d);
  } catch {
    return withTime ? d.toLocaleString() : d.toLocaleDateString();
  }
}

// Enmascara todo menos los últimos 3 dígitos.
export const maskPhone = (p: string) => `${'•'.repeat(Math.max(p.replace(/\D/g, '').length - 3, 0))}${p.replace(/\D/g, '').slice(-3)}`;
