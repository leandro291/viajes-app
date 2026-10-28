import { centsToSolesInput, parseSolesToCents } from "@/lib/money";
import type { PackageInput } from "../schemas/package-schema";

// Todo texto, salvo arrays: permite inputs vacíos. `key` es estable en cliente y no se envía.
export type PackageFormValues = {
  kind: "package" | "day_tour";
  title: string;
  blurb: string;
  description: string;
  destinationId: string;
  categoryIds: string[];
  price: string; // soles, "1290.50"
  durationDays: string;
  nights: string;
  durationHours: string;
  startTime: string;
  maxGroupSize: string;
  languages: ("es" | "en")[];
  meetingPoint: string;
  meetingLat: string;
  meetingLng: string;
  coverImageUrl: string;
  images: { key: string; url: string; alt: string; credit: string }[];
  itinerary: {
    key: string;
    title: string;
    description: string;
    place: string;
    transportLeg: string;
    imageUrl: string;
    lat: string;
    lng: string;
  }[];
  included: { key: string; text: string }[];
  excluded: { key: string; text: string }[];
};

export type FormErrors = Record<string, string>; // "title", "itinerary.0.title", "price"...

export type SectionProps = {
  values: PackageFormValues;
  errors: FormErrors;
  disabled: boolean;
  onChange: (patch: Partial<PackageFormValues>) => void;
};

export const newKey = (): string => crypto.randomUUID();

export function emptyItineraryDay(): PackageFormValues["itinerary"][number] {
  return {
    key: newKey(),
    title: "",
    description: "",
    place: "",
    transportLeg: "",
    imageUrl: "",
    lat: "",
    lng: "",
  };
}

export function emptyFormValues(): PackageFormValues {
  return {
    kind: "package",
    title: "",
    blurb: "",
    description: "",
    destinationId: "",
    categoryIds: [],
    price: "",
    durationDays: "",
    nights: "",
    durationHours: "",
    startTime: "",
    maxGroupSize: "",
    languages: ["es"],
    meetingPoint: "",
    meetingLat: "",
    meetingLng: "",
    coverImageUrl: "",
    images: [],
    itinerary: [emptyItineraryDay()],
    included: [],
    excluded: [],
  };
}

const str = (v: string | number | null): string => (v === null ? "" : String(v));

export function toFormValues(input: PackageInput): PackageFormValues {
  const items = (list: string[]) => list.map((text) => ({ key: newKey(), text }));
  return {
    kind: input.kind,
    title: input.title,
    blurb: input.blurb,
    description: input.description,
    destinationId: input.destinationId,
    categoryIds: [...input.categoryIds],
    price: centsToSolesInput(input.priceCents),
    durationDays: str(input.durationDays),
    nights: str(input.nights),
    durationHours: str(input.durationHours),
    startTime: str(input.startTime),
    maxGroupSize: str(input.maxGroupSize),
    languages: [...input.languages],
    meetingPoint: str(input.meetingPoint),
    meetingLat: str(input.meetingLat),
    meetingLng: str(input.meetingLng),
    coverImageUrl: input.coverImageUrl,
    images: input.images.map((i) => ({
      key: newKey(),
      url: i.url,
      alt: str(i.alt),
      credit: str(i.credit),
    })),
    itinerary: input.itinerary.map((d) => ({
      key: newKey(),
      title: d.title,
      description: d.description,
      place: d.place,
      transportLeg: str(d.transportLeg),
      imageUrl: str(d.imageUrl),
      lat: str(d.lat),
      lng: str(d.lng),
    })),
    included: items(input.included),
    excluded: items(input.excluded),
  };
}

// Requerido numérico: vacío o no numérico -> NaN, el schema lo rechaza con el mensaje del campo.
const num = (s: string): number => (s.trim() === "" ? NaN : Number(s));
// Opcional numérico: vacío -> null.
const optNum = (s: string): number | null => (s.trim() === "" ? null : Number(s));

// Envía todo lo escrito (incluso campos del otro `kind`): el schema normaliza por tipo.
export function toPackageInput(values: PackageFormValues, status: "draft" | "published"): unknown {
  const { price, images, itinerary, included, excluded, ...rest } = values;
  return {
    ...rest,
    priceCents: parseSolesToCents(price) ?? NaN,
    durationDays: num(values.durationDays),
    nights: num(values.nights),
    durationHours: num(values.durationHours),
    maxGroupSize: num(values.maxGroupSize),
    meetingLat: optNum(values.meetingLat),
    meetingLng: optNum(values.meetingLng),
    images: images.map(({ url, alt, credit }) => ({ url, alt, credit })),
    itinerary: itinerary.map(({ title, description, place, transportLeg, imageUrl, lat, lng }) => ({
      title,
      description,
      place,
      transportLeg,
      imageUrl,
      lat: optNum(lat),
      lng: optNum(lng),
    })),
    included: included.map((i) => i.text),
    excluded: excluded.map((i) => i.text),
    status,
  };
}

export function toFormErrors(fieldErrors: Record<string, string>): FormErrors {
  const out: FormErrors = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    out[key === "priceCents" ? "price" : key] = message;
  }
  return out;
}
