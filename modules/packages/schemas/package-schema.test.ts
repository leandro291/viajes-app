import { describe, expect, it } from "vitest";

import { toFieldErrors } from "../utils/field-errors";
import {
  IMAGE_URL_RE,
  isAllowedImageUrl,
  packageIdSchema,
  packageInputSchema,
  packageStatusSchema,
} from "./package-schema";

const UUID_A = "3f2b8c1e-6d4a-4b7e-9a1c-2d5e7f8a9b0c";
const UUID_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const BLOB = "https://abc123.public.blob.vercel-storage.com/paquetes/foto-1.jpg";

const day = () => ({
  title: "Llegada a Cusco",
  description: "Recepción en el aeropuerto y traslado al hotel.",
  place: "Cusco",
  transportLeg: "",
  imageUrl: "",
  lat: null,
  lng: null,
});

const validPackage = (): Record<string, unknown> => ({
  kind: "package",
  title: "Machu Picchu 3 días",
  blurb: "Tres días recorriendo la ciudadela y el Valle Sagrado.",
  description: "Un recorrido completo por Cusco, el Valle Sagrado y Machu Picchu con guía local.",
  destinationId: UUID_A,
  categoryIds: [UUID_B],
  priceCents: 129000,
  durationDays: 3,
  nights: 2,
  durationHours: 5,
  startTime: "08:00",
  maxGroupSize: 12,
  languages: ["es", "en"],
  meetingPoint: "",
  meetingLat: null,
  meetingLng: null,
  coverImageUrl: BLOB,
  images: [{ url: "/seed/cusco.jpg", alt: "", credit: "" }],
  itinerary: [day()],
  included: ["Transporte"],
  excluded: [],
  status: "draft",
});

const validDayTour = (): Record<string, unknown> => ({
  ...validPackage(),
  kind: "day_tour",
  durationDays: 4,
  nights: 3,
  durationHours: 6,
  startTime: "07:30",
});

const errorsOf = (input: unknown) => {
  const r = packageInputSchema.safeParse(input);
  return r.success ? null : toFieldErrors(r.error);
};

const parsed = (input: unknown) => {
  const r = packageInputSchema.safeParse(input);
  if (!r.success) throw new Error(JSON.stringify(toFieldErrors(r.error)));
  return r.data;
};

describe("packageInputSchema", () => {
  it("AC6: un paquete válido completo pasa", () => {
    expect(errorsOf(validPackage())).toBeNull();
    expect(errorsOf(validDayTour())).toBeNull();
  });

  it("AC6: cada requerido ausente falla en su campo", () => {
    const required = [
      "title",
      "blurb",
      "description",
      "destinationId",
      "categoryIds",
      "priceCents",
      "coverImageUrl",
      "itinerary",
      "maxGroupSize",
      "languages",
      "status",
    ];
    for (const key of required) {
      const input = validPackage();
      delete input[key];
      expect(errorsOf(input), key).toHaveProperty(key);
    }
  });

  it("AC6: kind ausente o inválido falla en kind", () => {
    const input = validPackage();
    delete input.kind;
    expect(errorsOf(input)).toHaveProperty("kind");
    expect(errorsOf({ ...validPackage(), kind: "tour" })).toHaveProperty("kind");
  });

  it("AC6: un borrador incompleto también es inválido", () => {
    const errors = errorsOf({
      ...validPackage(),
      status: "draft",
      title: "",
      categoryIds: [],
      languages: [],
      itinerary: [],
      coverImageUrl: "",
    });
    expect(errors).toMatchObject({
      title: expect.any(String),
      categoryIds: expect.any(String),
      languages: expect.any(String),
      itinerary: expect.any(String),
      coverImageUrl: expect.any(String),
    });
  });

  it("AC6: NaN y null en números dan error de campo, sin lanzar", () => {
    const errors = errorsOf({ ...validPackage(), priceCents: NaN, maxGroupSize: null });
    expect(errors).toHaveProperty("priceCents");
    expect(errors).toHaveProperty("maxGroupSize");
    expect(errorsOf(undefined)).not.toBeNull();
    expect(errorsOf(null)).not.toBeNull();
  });

  it("AC6: límites de título, resumen y descripción", () => {
    expect(errorsOf({ ...validPackage(), title: "ab" })).toHaveProperty("title");
    expect(errorsOf({ ...validPackage(), title: "abc" })).toBeNull();
    expect(errorsOf({ ...validPackage(), title: "a".repeat(101) })).toHaveProperty("title");
    expect(errorsOf({ ...validPackage(), title: "  ab  " })).toHaveProperty("title");
    expect(errorsOf({ ...validPackage(), blurb: "a".repeat(9) })).toHaveProperty("blurb");
    expect(errorsOf({ ...validPackage(), blurb: "a".repeat(201) })).toHaveProperty("blurb");
    expect(errorsOf({ ...validPackage(), description: "a".repeat(29) })).toHaveProperty("description");
    expect(errorsOf({ ...validPackage(), description: "a".repeat(5001) })).toHaveProperty("description");
    expect(parsed({ ...validPackage(), title: "  Hola  " }).title).toBe("Hola");
  });

  it("AC6: destino no uuid, categorías repetidas, >10 o inválidas fallan", () => {
    expect(errorsOf({ ...validPackage(), destinationId: "x" })).toHaveProperty("destinationId");
    expect(errorsOf({ ...validPackage(), categoryIds: [UUID_A, UUID_A] })).toHaveProperty("categoryIds");
    expect(errorsOf({ ...validPackage(), categoryIds: ["x"] })).toHaveProperty("categoryIds.0");
    const eleven = Array.from({ length: 11 }, () => crypto.randomUUID());
    expect(errorsOf({ ...validPackage(), categoryIds: eleven })).toHaveProperty("categoryIds");
    const ten = Array.from({ length: 10 }, () => crypto.randomUUID());
    expect(errorsOf({ ...validPackage(), categoryIds: ten })).toBeNull();
  });

  it("AC6: límites de precio 99 falla, 100 pasa, 10 000 000 pasa, +1 falla", () => {
    expect(errorsOf({ ...validPackage(), priceCents: 99 })).toHaveProperty("priceCents");
    expect(errorsOf({ ...validPackage(), priceCents: 100 })).toBeNull();
    expect(errorsOf({ ...validPackage(), priceCents: 10_000_000 })).toBeNull();
    expect(errorsOf({ ...validPackage(), priceCents: 10_000_001 })).toHaveProperty("priceCents");
    expect(errorsOf({ ...validPackage(), priceCents: 100.5 })).toHaveProperty("priceCents");
  });

  it("AC6: cupo 1..100 entero", () => {
    expect(errorsOf({ ...validPackage(), maxGroupSize: 0 })).toHaveProperty("maxGroupSize");
    expect(errorsOf({ ...validPackage(), maxGroupSize: 1 })).toBeNull();
    expect(errorsOf({ ...validPackage(), maxGroupSize: 100 })).toBeNull();
    expect(errorsOf({ ...validPackage(), maxGroupSize: 101 })).toHaveProperty("maxGroupSize");
    expect(errorsOf({ ...validPackage(), maxGroupSize: 2.5 })).toHaveProperty("maxGroupSize");
  });

  it("AC6: idiomas solo es|en y sin repetidos; status draft|published", () => {
    expect(errorsOf({ ...validPackage(), languages: ["fr"] })).toHaveProperty("languages.0");
    expect(errorsOf({ ...validPackage(), languages: ["es", "es"] })).toHaveProperty("languages");
    expect(errorsOf({ ...validPackage(), status: "archived" })).toHaveProperty("status");
    expect(errorsOf({ ...validPackage(), status: "published" })).toBeNull();
  });

  it("AC7: package con nights > durationDays falla en nights", () => {
    expect(errorsOf({ ...validPackage(), durationDays: 2, nights: 3 })).toHaveProperty("nights");
    expect(errorsOf({ ...validPackage(), durationDays: 2, nights: 2 })).toBeNull();
    expect(errorsOf({ ...validPackage(), durationDays: 1, nights: 0 })).toBeNull();
  });

  it("AC7: package exige durationDays 1..30 y nights >= 0", () => {
    expect(errorsOf({ ...validPackage(), durationDays: 0 })).toHaveProperty("durationDays");
    expect(errorsOf({ ...validPackage(), durationDays: 31 })).toHaveProperty("durationDays");
    expect(errorsOf({ ...validPackage(), durationDays: undefined })).toHaveProperty("durationDays");
    expect(errorsOf({ ...validPackage(), nights: -1 })).toHaveProperty("nights");
    expect(errorsOf({ ...validPackage(), nights: undefined })).toHaveProperty("nights");
  });

  it("AC7: package normaliza durationHours y startTime a null", () => {
    const out = parsed(validPackage());
    expect(out.durationHours).toBeNull();
    expect(out.startTime).toBeNull();
    expect(out.durationDays).toBe(3);
    expect(out.nights).toBe(2);
  });

  it("AC7: day_tour sin horas o sin hora de inicio falla", () => {
    expect(errorsOf({ ...validDayTour(), durationHours: null })).toHaveProperty("durationHours");
    expect(errorsOf({ ...validDayTour(), durationHours: 0 })).toHaveProperty("durationHours");
    expect(errorsOf({ ...validDayTour(), durationHours: 25 })).toHaveProperty("durationHours");
    expect(errorsOf({ ...validDayTour(), durationHours: 24 })).toBeNull();
    expect(errorsOf({ ...validDayTour(), startTime: null })).toHaveProperty("startTime");
    expect(errorsOf({ ...validDayTour(), startTime: "" })).toHaveProperty("startTime");
    for (const startTime of ["24:00", "8:30", "08:60", "0830"]) {
      expect(errorsOf({ ...validDayTour(), startTime }), startTime).toHaveProperty("startTime");
    }
    expect(errorsOf({ ...validDayTour(), startTime: "00:00" })).toBeNull();
    expect(errorsOf({ ...validDayTour(), startTime: "23:59" })).toBeNull();
  });

  it("AC7: day_tour normaliza durationDays a 1 y nights a 0", () => {
    const out = parsed(validDayTour());
    expect(out.durationDays).toBe(1);
    expect(out.nights).toBe(0);
    expect(out.durationHours).toBe(6);
    expect(out.startTime).toBe("07:30");
    const bare = validDayTour();
    delete bare.durationDays;
    delete bare.nights;
    expect(parsed(bare)).toMatchObject({ durationDays: 1, nights: 0 });
  });

  it("AC8: meetingPoint vacío pasa a null, ≤200", () => {
    expect(parsed(validPackage()).meetingPoint).toBeNull();
    expect(parsed({ ...validPackage(), meetingPoint: undefined }).meetingPoint).toBeNull();
    expect(parsed({ ...validPackage(), meetingPoint: " Plaza " }).meetingPoint).toBe("Plaza");
    expect(errorsOf({ ...validPackage(), meetingPoint: "a".repeat(201) })).toHaveProperty("meetingPoint");
  });

  it("AC8: lat/lng del punto de encuentro fuera de rango fallan", () => {
    expect(errorsOf({ ...validPackage(), meetingLat: 90.1, meetingLng: 0 })).toHaveProperty("meetingLat");
    expect(errorsOf({ ...validPackage(), meetingLat: -90.1, meetingLng: 0 })).toHaveProperty("meetingLat");
    expect(errorsOf({ ...validPackage(), meetingLat: 0, meetingLng: 180.1 })).toHaveProperty("meetingLng");
    expect(errorsOf({ ...validPackage(), meetingLat: 0, meetingLng: -180.1 })).toHaveProperty("meetingLng");
    const edge = parsed({ ...validPackage(), meetingLat: -90, meetingLng: 180 });
    expect(edge.meetingLat).toBe(-90);
    expect(edge.meetingLng).toBe(180);
  });

  it("AC8: par incompleto de lat/lng falla en el campo que falta", () => {
    expect(errorsOf({ ...validPackage(), meetingLat: -13.5, meetingLng: null })).toHaveProperty("meetingLng");
    expect(errorsOf({ ...validPackage(), meetingLat: null, meetingLng: -72 })).toHaveProperty("meetingLat");
    expect(errorsOf({ ...validPackage(), meetingLat: -13.5 })).toHaveProperty("meetingLng");
    const withCoords = { ...day(), lat: -13.5, lng: null };
    expect(errorsOf({ ...validPackage(), itinerary: [withCoords] })).toHaveProperty("itinerary.0.lng");
    const onlyLng = { ...day(), lat: null, lng: -72 };
    expect(errorsOf({ ...validPackage(), itinerary: [onlyLng] })).toHaveProperty("itinerary.0.lat");
    const both = { ...day(), lat: -13.5, lng: -72 };
    expect(parsed({ ...validPackage(), itinerary: [both] }).itinerary[0]).toMatchObject({
      lat: -13.5,
      lng: -72,
    });
  });

  it("AC8: lat/lng por día fuera de rango fallan; vacíos pasan a null", () => {
    const bad = { ...day(), lat: 91, lng: 0 };
    expect(errorsOf({ ...validPackage(), itinerary: [bad] })).toHaveProperty("itinerary.0.lat");
    const badLng = { ...day(), lat: 0, lng: 181 };
    expect(errorsOf({ ...validPackage(), itinerary: [badLng] })).toHaveProperty("itinerary.0.lng");
    const out = parsed({ ...validPackage(), itinerary: [{ ...day(), lat: undefined, lng: undefined }] });
    expect(out.itinerary[0]).toMatchObject({ lat: null, lng: null, transportLeg: null, imageUrl: null });
  });

  it("AC8: transportLeg ≤100", () => {
    const long = { ...day(), transportLeg: "a".repeat(101) };
    expect(errorsOf({ ...validPackage(), itinerary: [long] })).toHaveProperty("itinerary.0.transportLeg");
    const ok = { ...day(), transportLeg: "Bus 2 h" };
    expect(parsed({ ...validPackage(), itinerary: [ok] }).itinerary[0].transportLeg).toBe("Bus 2 h");
  });

  it("AC9: itinerario con más días que durationDays falla en durationDays", () => {
    const input = { ...validPackage(), durationDays: 2, nights: 1, itinerary: [day(), day(), day()] };
    expect(errorsOf(input)).toHaveProperty("durationDays");
    expect(errorsOf({ ...input, durationDays: 3, nights: 2 })).toBeNull();
  });

  it("AC9: day_tour admite como máximo 1 día de itinerario", () => {
    expect(errorsOf({ ...validDayTour(), itinerary: [day(), day()] })).toHaveProperty("itinerary");
    expect(errorsOf({ ...validDayTour(), itinerary: [day()] })).toBeNull();
  });

  it("AC9: itinerario vacío falla y los errores usan path itinerary.N.campo", () => {
    expect(errorsOf({ ...validPackage(), itinerary: [] })).toHaveProperty("itinerary");
    const errors = errorsOf({
      ...validPackage(),
      itinerary: [day(), { ...day(), title: "ab", description: "corta", place: "x" }],
    });
    expect(errors).toHaveProperty("itinerary.1.title");
    expect(errors).toHaveProperty("itinerary.1.description");
    expect(errors).toHaveProperty("itinerary.1.place");
    expect(errors).not.toHaveProperty("itinerary.0.title");
  });

  it("AC9: límites de título, descripción y lugar del día", () => {
    const check = (patch: object) => errorsOf({ ...validPackage(), itinerary: [{ ...day(), ...patch }] });
    expect(check({ title: "a".repeat(100) })).toBeNull();
    expect(check({ title: "a".repeat(101) })).toHaveProperty("itinerary.0.title");
    expect(check({ description: "a".repeat(10) })).toBeNull();
    expect(check({ description: "a".repeat(1500) })).toBeNull();
    expect(check({ description: "a".repeat(1501) })).toHaveProperty("itinerary.0.description");
    expect(check({ place: "ab" })).toBeNull();
    expect(check({ place: "a".repeat(101) })).toHaveProperty("itinerary.0.place");
  });

  it("AC9: day_number no se envía: el output del día no lo trae", () => {
    expect(Object.keys(parsed(validPackage()).itinerary[0]).sort()).toEqual(
      ["description", "imageUrl", "lat", "lng", "place", "title", "transportLeg"],
    );
  });

  it("AC9: inclusiones hasta 30 ítems de 2-150, sin vacíos, pueden ser listas vacías", () => {
    const thirty = Array.from({ length: 30 }, (_, i) => `Ítem ${i}`);
    expect(errorsOf({ ...validPackage(), included: thirty, excluded: thirty })).toBeNull();
    expect(errorsOf({ ...validPackage(), included: [...thirty, "Extra"] })).toHaveProperty("included");
    expect(errorsOf({ ...validPackage(), excluded: [...thirty, "Extra"] })).toHaveProperty("excluded");
    expect(errorsOf({ ...validPackage(), included: ["a"] })).toHaveProperty("included.0");
    expect(errorsOf({ ...validPackage(), included: ["ok", "   "] })).toHaveProperty("included.1");
    expect(errorsOf({ ...validPackage(), excluded: ["a".repeat(151)] })).toHaveProperty("excluded.0");
    expect(errorsOf({ ...validPackage(), included: ["a".repeat(150)] })).toBeNull();
    expect(errorsOf({ ...validPackage(), included: [], excluded: [] })).toBeNull();
    expect(parsed({ ...validPackage(), included: ["  Hotel  "] }).included).toEqual(["Hotel"]);
  });

  it("AC10: URL de Blob https y /seed/x.jpg pasan en portada, galería y día", () => {
    const input = {
      ...validPackage(),
      coverImageUrl: "/seed/portada.jpg",
      images: [{ url: BLOB, alt: "Vista", credit: "Ana" }],
      itinerary: [{ ...day(), imageUrl: BLOB }],
    };
    const out = parsed(input);
    expect(out.coverImageUrl).toBe("/seed/portada.jpg");
    expect(out.images[0]).toEqual({ url: BLOB, alt: "Vista", credit: "Ana" });
    expect(out.itinerary[0].imageUrl).toBe(BLOB);
  });

  it("AC10: http, otro host y javascript: son inválidos en las tres ubicaciones", () => {
    const bad = [
      "http://abc.public.blob.vercel-storage.com/a.jpg",
      "https://evil.com/a.jpg",
      "https://abc.public.blob.vercel-storage.com.evil.com/a.jpg",
      "https://abc.public.blob.vercel-storage.com@evil.com/a.jpg",
      "https://public.blob.vercel-storage.com/a.jpg",
      "javascript:alert(1)",
      "/otra/ruta.jpg",
      "/seed/../secreto.jpg",
      "//evil.com/a.jpg",
    ];
    for (const url of bad) {
      expect(errorsOf({ ...validPackage(), coverImageUrl: url }), url).toHaveProperty("coverImageUrl");
      expect(errorsOf({ ...validPackage(), images: [{ url, alt: "", credit: "" }] }), url).toHaveProperty(
        "images.0.url",
      );
      expect(errorsOf({ ...validPackage(), itinerary: [{ ...day(), imageUrl: url }] }), url).toHaveProperty(
        "itinerary.0.imageUrl",
      );
    }
  });

  it("AC10: isAllowedImageUrl e IMAGE_URL_RE", () => {
    expect(isAllowedImageUrl(BLOB)).toBe(true);
    expect(isAllowedImageUrl("/seed/x.jpg")).toBe(true);
    expect(isAllowedImageUrl("http://a.public.blob.vercel-storage.com/x.jpg")).toBe(false);
    expect(IMAGE_URL_RE.test("javascript:alert(1)")).toBe(false);
  });

  it("AC10: galería ≤12 con alt y crédito ≤200 opcionales (vacío -> null)", () => {
    const img = { url: BLOB, alt: "", credit: "" };
    expect(errorsOf({ ...validPackage(), images: Array(12).fill(img) })).toBeNull();
    expect(errorsOf({ ...validPackage(), images: Array(13).fill(img) })).toHaveProperty("images");
    expect(errorsOf({ ...validPackage(), images: [] })).toBeNull();
    expect(parsed({ ...validPackage(), images: [img] }).images[0]).toEqual({
      url: BLOB,
      alt: null,
      credit: null,
    });
    expect(parsed({ ...validPackage(), images: [{ url: BLOB }] }).images[0]).toEqual({
      url: BLOB,
      alt: null,
      credit: null,
    });
    const long = { url: BLOB, alt: "a".repeat(201), credit: "b".repeat(201) };
    const errors = errorsOf({ ...validPackage(), images: [long] });
    expect(errors).toHaveProperty("images.0.alt");
    expect(errors).toHaveProperty("images.0.credit");
    expect(errorsOf({ ...validPackage(), images: [{ url: BLOB, alt: "a".repeat(200) }] })).toBeNull();
  });

  it("AC10: portada vacía pide subir imagen", () => {
    expect(errorsOf({ ...validPackage(), coverImageUrl: "" })?.coverImageUrl).toBe("Sube una imagen de portada");
  });

  it("AC6: campos extra como organizerId o slug se descartan", () => {
    const out = parsed({
      ...validPackage(),
      organizerId: UUID_A,
      slug: "hackeado",
      images: [{ url: BLOB, alt: "", credit: "", extra: 1 }],
    });
    expect(out).not.toHaveProperty("organizerId");
    expect(out).not.toHaveProperty("slug");
    expect(out.images[0]).not.toHaveProperty("extra");
  });

  it("AC11: los mensajes de error están en español", () => {
    const errors = errorsOf({ ...validPackage(), title: "", priceCents: 1, categoryIds: [] }) ?? {};
    expect(errors.title).toBe("Ingresa un título de 3 a 100 caracteres");
    expect(errors.priceCents).toBe("Ingresa un precio entre S/ 1 y S/ 100 000");
    expect(errors.categoryIds).toBe("Elige al menos una categoría");
  });
});

describe("packageIdSchema y packageStatusSchema", () => {
  it("AC21: id uuid pasa; otro valor falla", () => {
    expect(packageIdSchema.safeParse(UUID_A).success).toBe(true);
    expect(packageIdSchema.safeParse("123").success).toBe(false);
  });

  it("AC6: status draft|published", () => {
    expect(packageStatusSchema.safeParse("draft").success).toBe(true);
    expect(packageStatusSchema.safeParse("published").success).toBe(true);
    expect(packageStatusSchema.safeParse("x").success).toBe(false);
  });
});
