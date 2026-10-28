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

// Cobro en USD (Stripe): siempre 2 decimales, mismo separador de miles que formatPen.
export function formatUsd(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const rest = Math.abs(cents % 100);
  const int = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return `US$${NBSP}${int}.${String(rest).padStart(2, "0")}`;
}

// Entrada del operador en soles ("1290", "1290.5", "1290,50") -> céntimos enteros. Sin coma flotante.
export function parseSolesToCents(input: string): number | null {
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

// Inverso de parseSolesToCents para precargar el input: "1290" | "120.50".
export function centsToSolesInput(cents: number): string {
  const rest = cents % 100;
  const whole = Math.trunc(cents / 100);
  return rest === 0
    ? String(whole)
    : `${whole}.${String(rest).padStart(2, "0")}`;
}
