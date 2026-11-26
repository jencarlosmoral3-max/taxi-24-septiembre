// Formato determinista (sin Intl/locale) para evitar diferencias servidor/cliente.
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const fechaCorta = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d} ${MESES[Number(m) - 1]}`;
};

export const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const bs = (n: number) => {
  const [e, d] = n.toFixed(2).split(".");
  return `Bs ${miles(Number(e))},${d}`;
};

// Los archivos de public/ no reciben basePath automáticamente con export estático.
export const asset = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;
