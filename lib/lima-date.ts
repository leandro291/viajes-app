const TZ = "America/Lima";

// Fechas en Lima aunque el servidor esté en UTC (AC5).
const limaParts = new Intl.DateTimeFormat("es-PE", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function parts(d: Date) {
  const get = (type: string) => limaParts.formatToParts(d).find((p) => p.type === type)!.value;
  return { weekday: get("weekday"), day: get("day"), month: get("month"), year: get("year") };
}

export function formatDepartureDate(d: Date): string {
  const p = parts(d);
  return `${p.weekday} ${p.day} de ${p.month}`;
}

export function formatDepartureChip(d: Date): { dow: string; day: string; month: string } {
  const p = parts(d);
  const dow = p.weekday.slice(0, 3);
  return { dow: dow.charAt(0).toUpperCase() + dow.slice(1), day: p.day, month: p.month.slice(0, 3) };
}

// "Jue 5 nov 2026"
export function formatDepartureShortDate(d: Date): string {
  const p = parts(d);
  const dow = p.weekday.slice(0, 3);
  return `${dow.charAt(0).toUpperCase()}${dow.slice(1)} ${p.day} ${p.month.slice(0, 3)} ${p.year}`;
}

const limaTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDepartureTime(d: Date): string {
  return formatStartTime(limaTime.format(d));
}

// "07:30:00" -> "7:30 a. m."
export function formatStartTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}
