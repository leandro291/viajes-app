import type { DestinationInput } from "../schemas/destination-schema";
import type { Season } from "../types/destination";

// Todo texto, salvo arrays: permite inputs vacíos. `key` es estable en cliente y no se envía.
export type DestinationFormValues = {
  name: string;
  region: string;
  tagline: string;
  description: string;
  altitudeM: string;
  bestSeasonText: string;
  fromLimaText: string;
  howToGetText: string;
  tipsText: string;
  heroImageUrl: string;
  climate: (Season | "")[]; // 12 posiciones, [0] = enero; "" = sin definir
  sights: {
    key: string;
    name: string;
    description: string;
    imageUrl: string;
    lat: string;
    lng: string;
  }[];
  faqs: { key: string; question: string; answer: string }[];
};

export type FormErrors = Record<string, string>; // "name", "sights.0.name", "climate"...

export type SectionProps = {
  values: DestinationFormValues;
  errors: FormErrors;
  disabled: boolean;
  onChange: (patch: Partial<DestinationFormValues>) => void;
};

export const newKey = (): string => crypto.randomUUID();

export function emptySight(): DestinationFormValues["sights"][number] {
  return {
    key: newKey(),
    name: "",
    description: "",
    imageUrl: "",
    lat: "",
    lng: "",
  };
}

export function emptyFaq(): DestinationFormValues["faqs"][number] {
  return { key: newKey(), question: "", answer: "" };
}

export function emptyFormValues(): DestinationFormValues {
  return {
    name: "",
    region: "",
    tagline: "",
    description: "",
    altitudeM: "",
    bestSeasonText: "",
    fromLimaText: "",
    howToGetText: "",
    tipsText: "",
    heroImageUrl: "",
    climate: Array.from({ length: 12 }, () => ""),
    sights: [],
    faqs: [],
  };
}

const str = (v: string | number | null): string =>
  v === null ? "" : String(v);

// Opcional numérico: vacío -> null; no numérico -> NaN, el schema lo rechaza con el mensaje del campo.
const optNum = (s: string): number | null =>
  s.trim() === "" ? null : Number(s);

export function toFormValues(input: DestinationInput): DestinationFormValues {
  return {
    name: input.name,
    region: input.region,
    tagline: str(input.tagline),
    description: str(input.description),
    altitudeM: str(input.altitudeM),
    bestSeasonText: str(input.bestSeasonText),
    fromLimaText: str(input.fromLimaText),
    howToGetText: str(input.howToGetText),
    tipsText: str(input.tipsText),
    heroImageUrl: input.heroImageUrl,
    climate: input.climate.map((c) => c ?? ""),
    sights: input.sights.map((s) => ({
      key: newKey(),
      name: s.name,
      description: s.description,
      imageUrl: s.imageUrl,
      lat: str(s.lat),
      lng: str(s.lng),
    })),
    faqs: input.faqs.map((f) => ({
      key: newKey(),
      question: f.question,
      answer: f.answer,
    })),
  };
}

// Los textos opcionales vacíos van como están: el schema los normaliza a null.
export function toDestinationInput(values: DestinationFormValues): unknown {
  const { climate, sights, faqs, altitudeM, ...rest } = values;
  return {
    ...rest,
    altitudeM: optNum(altitudeM),
    climate: climate.map((c) => c || null),
    sights: sights.map(({ name, description, imageUrl, lat, lng }) => ({
      name,
      description,
      imageUrl,
      lat: optNum(lat),
      lng: optNum(lng),
    })),
    faqs: faqs.map(({ question, answer }) => ({ question, answer })),
  };
}
