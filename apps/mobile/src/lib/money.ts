// Centavos -> "Bs 15" / "Bs 15,50" (coma decimal boliviana). Sin separador de miles (tarifas de taxi < Bs 1000).
export function formatMoney(cents: number): string {
  if (!Number.isFinite(cents)) return '—';
  const abs = Math.round(Math.abs(cents));
  if (abs === 0) return 'Bs 0'; // evita '-Bs 0'
  const bs = Math.floor(abs / 100);
  const c = abs % 100;
  return `${cents < 0 ? '-' : ''}Bs ${bs}${c ? `,${String(c).padStart(2, '0')}` : ''}`;
}

// Movil boliviano pegado/tipeado -> hasta 8 digitos (sin +591 ni 0 inicial).
export function parsePhoneDigits(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.length > 8 && d.startsWith('591')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 8);
}

// Texto de monto -> centavos enteros. '.' = miles, ',' = decimales (se descartan: solo Bs enteros). null = vacio.
export function parseMoneyCents(input: string): number | null {
  const digits = input.split(',')[0].replace(/\D/g, '').slice(0, 4);
  return digits === '' ? null : Number(digits) * 100;
}
