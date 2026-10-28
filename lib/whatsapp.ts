const MIN_DIGITS = 8;

export function buildWhatsAppUrl(number: string | undefined, message: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < MIN_DIGITS) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
