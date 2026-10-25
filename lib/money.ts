const NBSP = " ";
const NNBSP = " ";

// Catálogo siempre en soles. Sin Intl: es-PE no agrupa los números de 4 dígitos.
export function formatPen(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const rest = Math.abs(cents % 100);
  const int = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  const decimals = rest === 0 ? "" : `.${String(rest).padStart(2, "0")}`;
  return `S/${NBSP}${int}${decimals}`;
}
