import { describe, expect, it } from "vitest";

import type { PackageInput } from "../schemas/package-schema";
import {
  fkViolationField,
  isFkViolation,
  isUniqueViolation,
  pickAvailableSlug,
  toChildRows,
  toPackageRow,
  toPackageUpdate,
} from "./package-write";

const input: PackageInput = {
  kind: "package",
  title: "Machu Picchu 3 días",
  blurb: "Un viaje inolvidable",
  description: "Descripción larga del paquete para pasar el mínimo.",
  destinationId: "d0000000-0000-4000-8000-000000000001",
  categoryIds: ["c0000000-0000-4000-8000-000000000001", "c0000000-0000-4000-8000-000000000002"],
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
  coverImageUrl: "/seed/cover.jpg",
  images: [
    { url: "/seed/a.jpg", alt: "A", credit: null },
    { url: "/seed/b.jpg", alt: null, credit: "Foto B" },
  ],
  itinerary: [
    {
      title: "Día uno",
      description: "Llegada y traslado.",
      place: "Cusco",
      transportLeg: null,
      imageUrl: null,
      lat: null,
      lng: null,
    },
    {
      title: "Día dos",
      description: "Visita a la ciudadela.",
      place: "Machu Picchu",
      transportLeg: "Tren",
      imageUrl: "/seed/d2.jpg",
      lat: -13.16,
      lng: -72.54,
    },
  ],
  included: ["Guía", "Entradas", "Hotel"],
  excluded: ["Propinas"],
  status: "published",
};

describe("pickAvailableSlug", () => {
  it("AC14: slug libre -> la base", () => {
    expect(pickAvailableSlug("machu", [])).toBe("machu");
    expect(pickAvailableSlug("machu", ["otro", "machu-2"])).toBe("machu");
  });

  it("AC14: base ocupada -> -2", () => {
    expect(pickAvailableSlug("machu", ["machu"])).toBe("machu-2");
  });

  it("AC14: base y -2 ocupadas -> -3", () => {
    expect(pickAvailableSlug("machu", ["machu", "machu-2"])).toBe("machu-3");
  });

  it("AC14: toma en cuenta huecos (primer N libre)", () => {
    expect(pickAvailableSlug("machu", ["machu", "machu-3"])).toBe("machu-2");
    expect(pickAvailableSlug("machu", ["machu", "machu-2", "machu-4"])).toBe("machu-3");
  });
});

describe("toPackageRow", () => {
  it("AC13: usa el organizer del argumento, PEN, el status y el slug dados", () => {
    const row = toPackageRow("org-1", { ...input, status: "draft" }, "machu-2");
    expect(row).toMatchObject({
      organizerId: "org-1",
      currency: "PEN",
      status: "draft",
      slug: "machu-2",
      title: input.title,
      priceCents: 129050,
      destinationId: input.destinationId,
      languages: ["es", "en"],
      meetingLat: -13.5,
      coverImageUrl: "/seed/cover.jpg",
    });
  });

  it("AC13: day_tour conserva horas y hora de inicio", () => {
    const row = toPackageRow(
      "org-1",
      { ...input, kind: "day_tour", durationDays: 1, nights: 0, durationHours: 6, startTime: "08:30" },
      "x",
    );
    expect(row).toMatchObject({ kind: "day_tour", durationHours: 6, startTime: "08:30" });
  });

  it("AC13: no incluye createdAt ni id", () => {
    const row = toPackageRow("org-1", input, "x");
    expect(row).not.toHaveProperty("createdAt");
    expect(row).not.toHaveProperty("id");
  });
});

describe("toPackageUpdate", () => {
  it("AC15: no incluye organizerId, slug, createdAt ni id", () => {
    const row = toPackageUpdate(input);
    for (const key of ["organizerId", "slug", "createdAt", "id"]) {
      expect(row).not.toHaveProperty(key);
    }
  });

  it("AC15: trae los campos editables y toPackageRow los reutiliza", () => {
    const row = toPackageUpdate(input);
    expect(row).toMatchObject({ title: input.title, currency: "PEN", priceCents: 129050 });
    expect(toPackageRow("org-1", input, "x")).toEqual({ ...row, organizerId: "org-1", slug: "x" });
  });
});

describe("toChildRows", () => {
  const rows = toChildRows("pkg-1", input);

  it("AC13: categorías con packageId", () => {
    expect(rows.categories).toEqual([
      { packageId: "pkg-1", categoryId: input.categoryIds[0] },
      { packageId: "pkg-1", categoryId: input.categoryIds[1] },
    ]);
  });

  it("AC13: imágenes con sortOrder 0..n", () => {
    expect(rows.images.map((r) => [r.url, r.sortOrder])).toEqual([
      ["/seed/a.jpg", 0],
      ["/seed/b.jpg", 1],
    ]);
    expect(rows.images[1]).toMatchObject({ alt: null, credit: "Foto B", packageId: "pkg-1" });
  });

  it("AC13: itinerario con dayNumber 1..n", () => {
    expect(rows.itinerary.map((r) => r.dayNumber)).toEqual([1, 2]);
    expect(rows.itinerary[1]).toMatchObject({
      packageId: "pkg-1",
      title: "Día dos",
      place: "Machu Picchu",
      transportLeg: "Tren",
      imageUrl: "/seed/d2.jpg",
      lat: -13.16,
      lng: -72.54,
    });
  });

  it("AC13: inclusiones con kind y sortOrder por lista", () => {
    expect(rows.inclusions.map((r) => [r.kind, r.text, r.sortOrder])).toEqual([
      ["included", "Guía", 0],
      ["included", "Entradas", 1],
      ["included", "Hotel", 2],
      ["excluded", "Propinas", 0],
    ]);
  });

  it("AC13: listas vacías -> arreglos vacíos", () => {
    const empty = toChildRows("pkg-1", { ...input, images: [], included: [], excluded: [] });
    expect(empty.images).toEqual([]);
    expect(empty.inclusions).toEqual([]);
  });
});

describe("isFkViolation", () => {
  it("AC18: código 23503 directo y en cause", () => {
    expect(isFkViolation({ code: "23503" })).toBe(true);
    expect(isFkViolation({ cause: { code: "23503" } })).toBe(true);
  });

  it("AC18: otros códigos o valores -> false", () => {
    expect(isFkViolation({ code: "23505" })).toBe(false);
    expect(isFkViolation({ cause: { code: "23505" } })).toBe(false);
    expect(isFkViolation(new Error("x"))).toBe(false);
    expect(isFkViolation(null)).toBe(false);
    expect(isFkViolation(undefined)).toBe(false);
    expect(isFkViolation("23503")).toBe(false);
  });
});

describe("fkViolationField", () => {
  it("AC13: constraint de destino -> destinationId (directo y en cause)", () => {
    const constraint = "packages_destination_id_destinations_id_fk";
    expect(fkViolationField({ code: "23503", constraint })).toBe("destinationId");
    expect(fkViolationField({ cause: { code: "23503", constraint } })).toBe("destinationId");
    expect(fkViolationField({ cause: { code: "23503", constraint_name: constraint } })).toBe(
      "destinationId",
    );
  });

  it("AC13: constraint de categoría -> categoryIds", () => {
    const constraint = "package_categories_category_id_categories_id_fk";
    expect(fkViolationField({ cause: { code: "23503", constraint } })).toBe("categoryIds");
  });

  it("AC13: FK no mapeable, otro código o valor -> null", () => {
    expect(
      fkViolationField({ code: "23503", constraint: "bookings_package_id_packages_id_fk" }),
    ).toBeNull();
    expect(fkViolationField({ code: "23503" })).toBeNull();
    expect(
      fkViolationField({ code: "23505", constraint: "packages_destination_id_destinations_id_fk" }),
    ).toBeNull();
    expect(fkViolationField(new Error("x"))).toBeNull();
    expect(fkViolationField(null)).toBeNull();
  });
});

describe("isUniqueViolation", () => {
  it("AC14: código 23505 directo y en cause", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
  });

  it("AC14: otros códigos o valores -> false", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation({ cause: { code: "23503" } })).toBe(false);
    expect(isUniqueViolation(new Error("x"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });

  it("AC14: con constraint compara constraint o constraint_name (directo y en cause)", () => {
    expect(isUniqueViolation({ code: "23505", constraint: "packages_slug_unique" }, "packages_slug_unique")).toBe(true);
    expect(isUniqueViolation({ code: "23505", constraint_name: "packages_slug_unique" }, "packages_slug_unique")).toBe(true);
    expect(
      isUniqueViolation({ cause: { code: "23505", constraint: "packages_slug_unique" } }, "packages_slug_unique"),
    ).toBe(true);
    expect(isUniqueViolation({ code: "23505", constraint: "otro_unique" }, "packages_slug_unique")).toBe(false);
    expect(isUniqueViolation({ code: "23505" }, "packages_slug_unique")).toBe(false);
  });
});
