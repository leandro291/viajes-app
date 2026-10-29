import { describe, expect, it } from "vitest";

import {
  destinationInputSchema,
  type DestinationInput,
} from "../schemas/destination-schema";
import {
  emptyFormValues,
  toDestinationInput,
  toFormValues,
} from "./destination-form";

const BLOB = "https://x.public.blob.vercel-storage.com/a.jpg";

const input: DestinationInput = {
  name: "Cusco",
  region: "Cusco",
  heroImageUrl: BLOB,
  tagline: "Capital del imperio",
  description: null,
  altitudeM: 3399,
  bestSeasonText: null,
  fromLimaText: "1 h en avión",
  howToGetText: null,
  tipsText: null,
  climate: [
    "dry",
    "dry",
    "mixed",
    "mixed",
    "rainy",
    "rainy",
    "dry",
    "dry",
    "dry",
    "mixed",
    "rainy",
    "rainy",
  ],
  sights: [
    {
      name: "Sacsayhuamán",
      description: "Fortaleza ceremonial inca.",
      imageUrl: BLOB,
      lat: -13.5,
      lng: -71.98,
    },
    {
      name: "Qoricancha",
      description: "Templo del sol en el centro.",
      imageUrl: BLOB,
      lat: null,
      lng: null,
    },
  ],
  faqs: [{ question: "¿Hay altura?", answer: "Sí, aclimátate el primer día." }],
};

describe("destination-form", () => {
  it("AC22: toFormValues -> toDestinationInput -> schema devuelve el input original", () => {
    const values = toFormValues(input);
    expect(values.altitudeM).toBe("3399");
    expect(values.description).toBe("");
    expect(values.sights[1].lat).toBe("");
    const raw = toDestinationInput(values);
    expect(destinationInputSchema.parse(raw)).toEqual(input);
  });

  it("AC24: descarta la key de lugares y preguntas", () => {
    const raw = toDestinationInput(toFormValues(input)) as {
      sights: object[];
      faqs: object[];
    };
    expect(raw.sights.every((s) => !("key" in s))).toBe(true);
    expect(raw.faqs.every((f) => !("key" in f))).toBe(true);
  });

  it("AC22: climate '' -> null; todo vacío pasa como 12 null", () => {
    const values = {
      ...toFormValues(input),
      climate: Array.from({ length: 12 }, () => "" as const),
    };
    const parsed = destinationInputSchema.parse(toDestinationInput(values));
    expect(parsed.climate).toEqual(Array(12).fill(null));
  });

  it("AC24: altitud no numérica falla en el schema, vacía -> null", () => {
    const values = toFormValues(input);
    expect(
      destinationInputSchema.safeParse(
        toDestinationInput({ ...values, altitudeM: "abc" }),
      ).success,
    ).toBe(false);
    const parsed = destinationInputSchema.parse(
      toDestinationInput({ ...values, altitudeM: " " }),
    );
    expect(parsed.altitudeM).toBeNull();
  });

  it("AC22: emptyFormValues tiene 12 meses y no pasa el schema", () => {
    const empty = emptyFormValues();
    expect(empty.climate).toHaveLength(12);
    expect(empty.sights).toEqual([]);
    const res = destinationInputSchema.safeParse(toDestinationInput(empty));
    expect(res.success).toBe(false);
  });
});
