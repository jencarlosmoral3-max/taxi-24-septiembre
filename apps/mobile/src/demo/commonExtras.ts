// Fase 1 (demo): datos de ejemplo. Se borra en fase 2 (plan-pantallas.md).
import type { DemoTrip } from './data';

export const FAQ = [
  { q: '¿Cómo funciona la puja?', a: 'Tú ofreces cuánto quieres pagar. Los conductores cercanos aceptan tu precio o te proponen otro. Tú eliges la oferta que más te convenga.' },
  { q: '¿Cómo pago?', a: 'En efectivo, directamente al conductor al terminar el viaje. Por ahora no hay pagos dentro de la app.' },
  { q: '¿Qué pasa si cancelo?', a: 'Puedes cancelar antes de que el conductor llegue, indicando el motivo. Cancelar muchas veces seguidas puede afectar tu calificación.' },
  { q: '¿Cómo funciona el botón SOS?', a: 'Durante el viaje, el botón SOS te pide confirmar, avisa al sindicato con tu ubicación y abre el marcador con el 110 (no llama solo). Úsalo solo en una emergencia.' },
  { q: '¿Cómo me registro como conductor?', a: 'Cambia a modo Conductor en tu perfil y completa el registro: datos, licencia, vehículo y fotos. El sindicato revisa tu solicitud y te avisa cuando esté aprobada.' },
  { q: '¿Qué pasa con mis datos y mi teléfono?', a: 'Tu teléfono solo lo ve la otra persona del viaje mientras el viaje está asignado. No lo compartimos con nadie más.' },
] as const;

const TRIP_STATUS: Record<string, { label: string; ok: boolean }> = { completed: { label: 'Completado', ok: true } };
export const tripStatus = (s: DemoTrip['status']) => TRIP_STATUS[s] ?? { label: 'Cancelado', ok: false };

// Cancelados no tienen completed_at: cae a cancelled_at.
export const tripDate = (t: DemoTrip) => t.completed_at ?? t.cancelled_at;

export function formatDateTime(iso: string | null, withTime = true): string {
  if (!iso) return 'Sin fecha';
  return new Date(iso).toLocaleString('es-BO', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime && { hour: '2-digit', minute: '2-digit' }) });
}

// Enmascara todo menos los últimos 3 dígitos.
export const maskPhone = (p: string) => `${'•'.repeat(Math.max(p.replace(/\D/g, '').length - 3, 0))}${p.replace(/\D/g, '').slice(-3)}`;
