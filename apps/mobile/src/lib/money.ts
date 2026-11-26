// Centavos -> "Bs 15" / "Bs 15,50" (coma decimal boliviana). Sin separador de miles (tarifas de taxi < Bs 1000).
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.round(Math.abs(cents));
  const bs = Math.floor(abs / 100);
  const c = abs % 100;
  return `${sign}Bs ${bs}${c ? `,${String(c).padStart(2, '0')}` : ''}`;
}
