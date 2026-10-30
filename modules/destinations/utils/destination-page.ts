const NBSP = " ";
const NNBSP = " ";

export const ALTITUDE_THRESHOLD_M = 2000;

export const SEASON_LABEL: Record<"dry" | "mixed" | "rainy", string> = {
  dry: "Seca",
  mixed: "Mixta",
  rainy: "Lluvias",
};

export const MONTH_SHORT: readonly string[] = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export const MONTH_NAMES: readonly string[] = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// `card` es el contenido del popup; sin él, el popup muestra solo el nombre.
export type PinCard = {
  eyebrow: string;
  title: string;
  note?: string | null;
  imageUrl?: string | null;
};
export type MapPin = { n: number; name: string; lat: number; lng: number; card?: PinCard };

// Sin Intl: es-PE no agrupa los números de 4 dígitos (igual que formatPen).
export function formatAltitude(m: number): string {
  const int = String(Math.trunc(m)).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return `${int}${NBSP}m${NBSP}s.${NBSP}n.${NBSP}m.`;
}

const NUMBER_WORDS = [
  "Un", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve",
];

export function sightsHeading(n: number): string {
  if (n < 1) return "Lugares que justifican el viaje";
  if (n === 1) return "Un lugar que justifica el viaje";
  const count = n <= 9 ? NUMBER_WORDS[n - 1] : String(n);
  return `${count} lugares que justifican el viaje`;
}

export function beforeYouGo(altitudeM: number | null): {
  heading: string;
  tipsLabel: string;
} {
  return altitudeM !== null && altitudeM >= ALTITUDE_THRESHOLD_M
    ? { heading: "Prepárate para la altura", tipsLabel: "Aclimatación" }
    : { heading: "Prepara tu viaje", tipsLabel: "Consejos" };
}

// El número es la posición en la lista completa: un lugar sin coordenadas no renumera a los demás.
export function mapPins(
  sights: { name: string; lat: number | null; lng: number | null; card?: PinCard }[],
): MapPin[] {
  return sights.flatMap(({ name, lat, lng, card }, i) =>
    lat !== null && lng !== null ? [{ n: i + 1, name, lat, lng, ...(card && { card }) }] : [],
  );
}
