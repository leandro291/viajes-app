import { describe, expect, it } from "vitest";
import { packageInputSchema, type PackageInput } from "../schemas/package-schema";
import { toFieldErrors } from "./field-errors";
import {
  emptyFormValues,
  toFormErrors,
  toFormValues,
  toPackageInput,
} from "./package-form";

const BLOB = "https://x.public.blob.vercel-storage.com/a.jpg";

const pkg: PackageInput = {
  kind: "package",
  title: "Machu Picchu 3 días",
  blurb: "Tres días entre ruinas y montañas.",
  description: "Una descripción larga del viaje que supera los treinta caracteres.",
  destinationId: "11111111-1111-4111-8111-111111111111",
  categoryIds: ["22222222-2222-4222-8222-222222222222"],
  priceCents: 129050,
  durationDays: 3,
  nights: 2,
  durationHours: null,
  startTime: null,
  maxGroupSize: 12,
  languages: ["es", "en"],
  meetingPoint: "Plaza de Armas",
  meetingLat: -13.5,
  meetingLng: -71.97,
  coverImageUrl: BLOB,
  images: [{ url: BLOB, alt: "Vista", credit: null }],
  itinerary: [
    {
      title: "Día uno",
      description: "Llegada y recorrido por la ciudad.",
      place: "Cusco",
      transportLeg: null,
      imageUrl: BLOB,
      lat: -13.5,
      lng: -71.97,
    },
    {
      title: "Día dos",
      description: "Visita a la ciudadela inca.",
      place: "Aguas Calientes",
      transportLeg: "Tren",
      imageUrl: null,
      lat: null,
      lng: null,
    },
  ],
  included: ["Guía", "Transporte"],
  excluded: ["Propinas"],
  status: "published",
};

describe("package-form", () => {
  it("AC12: ida y vuelta toFormValues <-> toPackageInput devuelve el mismo input", () => {
    const values = toFormValues(pkg);
    expect(values.price).toBe("1290.50");
    expect(packageInputSchema.parse(toPackageInput(values, pkg.status))).toEqual(pkg);
  });

  it("AC12: ida y vuelta de un day_tour", () => {
    const tour: PackageInput = {
      ...pkg,
      kind: "day_tour",
      durationDays: 1,
      nights: 0,
      durationHours: 6,
      startTime: "08:30",
      itinerary: [pkg.itinerary[0]],
      priceCents: 9500,
      meetingPoint: null,
      meetingLat: null,
      meetingLng: null,
      status: "draft",
    };
    const values = toFormValues(tour);
    expect(values.price).toBe("95");
    expect(values.meetingLat).toBe("");
    expect(packageInputSchema.parse(toPackageInput(values, "draft"))).toEqual(tour);
  });

  it("AC12: el input no lleva key y los opcionales numéricos vacíos son null", () => {
    const values = toFormValues(pkg);
    values.meetingLat = "";
    values.meetingLng = "";
    values.itinerary[1].lat = "";
    const input = toPackageInput(values, "draft") as Record<string, unknown>;
    expect(input.meetingLat).toBeNull();
    expect(input.meetingLng).toBeNull();
    expect(JSON.stringify(input)).not.toContain('"key"');
    expect(input.status).toBe("draft");
  });

  it("AC12: toFormValues genera keys únicas", () => {
    const v = toFormValues(pkg);
    const keys = [...v.images, ...v.itinerary, ...v.included, ...v.excluded].map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("AC12: precio inválido produce error en priceCents", () => {
    for (const price of ["abc", "1.234", ""]) {
      const values = { ...toFormValues(pkg), price };
      const r = packageInputSchema.safeParse(toPackageInput(values, "draft"));
      expect(r.success).toBe(false);
      if (!r.success) expect(toFieldErrors(r.error).priceCents).toBeTruthy();
    }
  });

  it("AC28: emptyFormValues tiene 1 día, no pasa el schema y envía arrays siempre", () => {
    const empty = emptyFormValues();
    expect(empty.itinerary).toHaveLength(1);
    expect(empty.languages).toEqual(["es"]);
    const input = toPackageInput(empty, "draft") as Record<string, unknown>;
    expect(Array.isArray(input.images)).toBe(true);
    expect(Array.isArray(input.included)).toBe(true);
    expect(Array.isArray(input.excluded)).toBe(true);
    const r = packageInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = toFieldErrors(r.error);
      expect(errors.title).toBeTruthy();
      expect(errors.priceCents).toBeTruthy();
      expect(errors.images).toBeUndefined();
    }
  });

  it("AC28: toFormErrors mapea priceCents a price y deja el resto", () => {
    expect(toFormErrors({ priceCents: "mal", title: "x", "itinerary.0.title": "y" })).toEqual({
      price: "mal",
      title: "x",
      "itinerary.0.title": "y",
    });
  });
});
