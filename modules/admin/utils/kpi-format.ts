import { formatPen } from "@/lib/money";

const DASH = "—";

// Tasa 0-100 con 1 decimal sin ".0": 8.3 -> "8.3 %", 12 -> "12 %", null -> "—".
export function formatRate(rate: number | null): string {
  return rate === null ? DASH : `${Number(rate.toFixed(1))} %`;
}

export function formatMoneyOrDash(cents: number | null): string {
  return cents === null ? DASH : formatPen(cents);
}
