import { describe, expect, it } from "vitest";

import { toFieldErrors } from "@/modules/packages/utils/field-errors"; // el barrel arrastra lib/db (requiere DATABASE_URL)

import { destinationIdSchema, destinationInputSchema } from "./destination-schema";

const BLOB = "https://abc123.public.blob.vercel-storage.com/destinos/foto-1.jpg";
const none = () => Array<null>(12).fill(null);

const base = () => ({
  name: "Cusco",
  region: "Cusco",
  heroImageUrl: BLOB,
  tagline: "",
  description: "",
  altitudeM: null,
  bestSeasonText: "",
  fromLimaText: "",
  howToGetText: "",
  tipsText: "",
  climate: none(),
  sights: [] as unknown[],
  faqs: [] as unknown[],
});

const sight = () => ({
  name: "Sacsayhuamán",
  description: "Fortaleza inca con vista a la ciudad.",
  imageUrl: "/seed/sacsayhuaman.jpg",
  lat: null,
  lng: null,
});

const errors = (input: unknown) => {
  const r = destinationInputSchema.safeParse(input);
  return r.success ? null : toFieldErrors(r.error);
};

describe("destinationInputSchema", () => {
  it("AC10: destino mínimo válido; vacíos -> null", () => {
    const r = destinationInputSchema.safeParse(base());
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tagline).toBeNull();
      expect(r.data.tipsText).toBeNull();
      expect(r.data.altitudeM).toBeNull();
    }
  });

  it("AC10: faltantes fallan", () => {
    expect(errors({ ...base(), name: "" })?.name).toBeTruthy();
    expect(errors({ ...base(), region: "" })?.region).toBeTruthy();
    expect(errors({ ...base(), heroImageUrl: "" })?.heroImageUrl).toBeTruthy();
  });

  it("AC10: nombre sin letras ni dígitos es inválido; con trim", () => {
    expect(errors({ ...base(), name: "!!!" })?.name).toBeTruthy();
    const r = destinationInputSchema.safeParse({ ...base(), name: "  Cusco  " });
    expect(r.success && r.data.name).toBe("Cusco");
  });

  it("AC10: límites de texto", () => {
    expect(errors({ ...base(), name: "a".repeat(80) })).toBeNull();
    expect(errors({ ...base(), name: "a".repeat(81) })?.name).toBeTruthy();
    expect(errors({ ...base(), region: "a" })?.region).toBeTruthy();
    expect(errors({ ...base(), tagline: "a".repeat(160) })).toBeNull();
    expect(errors({ ...base(), tagline: "a".repeat(161) })?.tagline).toBeTruthy();
    expect(errors({ ...base(), description: "a".repeat(2001) })?.description).toBeTruthy();
    expect(errors({ ...base(), bestSeasonText: "a".repeat(121) })?.bestSeasonText).toBeTruthy();
    expect(errors({ ...base(), fromLimaText: "a".repeat(121) })?.fromLimaText).toBeTruthy();
    expect(errors({ ...base(), howToGetText: "a".repeat(1001) })?.howToGetText).toBeTruthy();
    expect(errors({ ...base(), tipsText: "a".repeat(1001) })?.tipsText).toBeTruthy();
  });

  it("AC10: altitud entera entre 0 y 9000", () => {
    expect(errors({ ...base(), altitudeM: 0 })).toBeNull();
    expect(errors({ ...base(), altitudeM: 9000 })).toBeNull();
    expect(errors({ ...base(), altitudeM: -1 })?.altitudeM).toBeTruthy();
    expect(errors({ ...base(), altitudeM: 9001 })?.altitudeM).toBeTruthy();
    expect(errors({ ...base(), altitudeM: 3399.5 })?.altitudeM).toBeTruthy();
  });

  it("AC10: portada solo Blob https o /seed; slug e id extra se descartan", () => {
    expect(errors({ ...base(), heroImageUrl: "/seed/cusco.jpg" })).toBeNull();
    expect(errors({ ...base(), heroImageUrl: "http://x.public.blob.vercel-storage.com/a.jpg" })?.heroImageUrl).toBeTruthy();
    expect(errors({ ...base(), heroImageUrl: "javascript:alert(1)" })?.heroImageUrl).toBeTruthy();
    const r = destinationInputSchema.safeParse({ ...base(), slug: "x", id: "y" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("slug");
      expect(r.data).not.toHaveProperty("id");
    }
  });

  it("AC11: clima todo null o todo definido", () => {
    expect(errors({ ...base(), climate: Array(12).fill("dry") })).toBeNull();
    expect(errors({ ...base(), climate: [...Array(11).fill("dry"), null] })?.climate).toBe(
      "Define los 12 meses o déjalos todos sin definir",
    );
    expect(errors({ ...base(), climate: Array(11).fill("dry") })?.climate).toBeTruthy();
    expect(errors({ ...base(), climate: Array(13).fill("dry") })?.climate).toBeTruthy();
    expect(errors({ ...base(), climate: [] })?.climate).toBeTruthy();
  });

  it("AC12: lugares con tope 12/13 y 0 permitido", () => {
    expect(errors({ ...base(), sights: Array.from({ length: 12 }, sight) })).toBeNull();
    expect(errors({ ...base(), sights: Array.from({ length: 13 }, sight) })?.sights).toBeTruthy();
  });

  it("AC12/AC13: lugar con imagen faltante o inválida, claves por path", () => {
    expect(errors({ ...base(), sights: [{ ...sight(), imageUrl: "" }] })?.["sights.0.imageUrl"]).toBeTruthy();
    expect(errors({ ...base(), sights: [sight(), { ...sight(), imageUrl: "https://evil.com/a.jpg" }] })?.["sights.1.imageUrl"]).toBeTruthy();
    expect(errors({ ...base(), sights: [{ ...sight(), name: "a" }] })?.["sights.0.name"]).toBeTruthy();
    expect(errors({ ...base(), sights: [{ ...sight(), description: "corta" }] })?.["sights.0.description"]).toBeTruthy();
  });

  it("AC12: lat/lng juntas o ambas vacías, y en rango", () => {
    expect(errors({ ...base(), sights: [{ ...sight(), lat: -13.5, lng: -71.9 }] })).toBeNull();
    expect(errors({ ...base(), sights: [{ ...sight(), lat: -13.5 }] })?.["sights.0.lng"]).toBeTruthy();
    expect(errors({ ...base(), sights: [{ ...sight(), lng: -71.9 }] })?.["sights.0.lat"]).toBeTruthy();
    expect(errors({ ...base(), sights: [{ ...sight(), lat: 91, lng: 0 }] })?.["sights.0.lat"]).toBeTruthy();
    expect(errors({ ...base(), sights: [{ ...sight(), lat: 0, lng: 181 }] })?.["sights.0.lng"]).toBeTruthy();
  });

  it("AC12/AC13: faqs con tope 20/21 y longitudes", () => {
    const faq = { question: "¿Cuándo ir?", answer: "De mayo a septiembre." };
    expect(errors({ ...base(), faqs: Array.from({ length: 20 }, () => faq) })).toBeNull();
    expect(errors({ ...base(), faqs: Array.from({ length: 21 }, () => faq) })?.faqs).toBeTruthy();
    expect(errors({ ...base(), faqs: [faq, { ...faq, answer: "corta" }] })?.["faqs.1.answer"]).toBeTruthy();
    expect(errors({ ...base(), faqs: [{ ...faq, question: "a?" }] })?.["faqs.0.question"]).toBeTruthy();
  });
});

describe("destinationIdSchema", () => {
  it("AC18: solo uuid", () => {
    expect(destinationIdSchema.safeParse("7c9e6679-7425-40de-944b-e07fc1f90ae7").success).toBe(true);
    expect(destinationIdSchema.safeParse("abc").success).toBe(false);
  });
});
