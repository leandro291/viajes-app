import { describe, expect, it } from "vitest";

import {
  buildCheckoutHref,
  buildDetailHref,
  clampTravelers,
  formatDepartureChip,
  formatDepartureDate,
  formatDepartureTime,
  formatLanguages,
  formatPackageDuration,
  formatStartTime,
  isValidSlug,
  parseDetailParams,
  resolveBooking,
  seatsLabel,
  seatsLeft,
} from "./package-detail";

const ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

describe("parseDetailParams (AC2)", () => {
  it("acepta uuid y viajeros válidos", () => {
    expect(parseDetailParams({ salida: ID, viajeros: "3" })).toEqual({ salida: ID, viajeros: 3 });
  });

  it("descarta lo inválido sin lanzar", () => {
    expect(parseDetailParams({ salida: "zzz", viajeros: "99" })).toEqual({});
    for (const v of ["0", "21", "abc", "2.5", "-1", ""]) {
      expect(parseDetailParams({ viajeros: v })).toEqual({});
    }
    expect(parseDetailParams({})).toEqual({});
  });

  it("toma el primer valor de un array", () => {
    expect(parseDetailParams({ salida: [ID, "x"], viajeros: ["4", "5"] })).toEqual({
      salida: ID,
      viajeros: 4,
    });
  });
});

describe("hrefs (AC3)", () => {
  it("sin params no deja '?'", () => {
    expect(buildDetailHref("mp", {}, {})).toBe("/paquetes/mp");
  });

  it("conserva el otro param, omite vacíos y ordena las claves", () => {
    expect(buildDetailHref("mp", { viajeros: 2 }, { salida: ID })).toBe(
      `/paquetes/mp?salida=${ID}&viajeros=2`,
    );
    expect(buildDetailHref("mp", { salida: ID, viajeros: 2 }, { viajeros: undefined })).toBe(
      `/paquetes/mp?salida=${ID}`,
    );
  });

  it("buildCheckoutHref", () => {
    expect(buildCheckoutHref(ID, 3)).toBe(`/pago?salida=${ID}&viajeros=3`);
  });
});

describe("cupo (AC4)", () => {
  it("seatsLeft nunca baja de 0", () => {
    expect(seatsLeft({ capacity: 12, bookedSeats: 2 })).toBe(10);
    expect(seatsLeft({ capacity: 5, bookedSeats: 7 })).toBe(0);
  });

  it("seatsLabel", () => {
    expect(seatsLabel(0)).toBe("Agotado");
    expect(seatsLabel(1)).toBe("Queda 1 cupo");
    expect(seatsLabel(3)).toBe("Quedan 3 cupos");
  });

  it("clampTravelers acota a [1, min(grupo, cupo)]", () => {
    expect(clampTravelers(5, 12, 3)).toBe(3);
    expect(clampTravelers(20, 4, 10)).toBe(4);
    expect(clampTravelers(0, 12, 12)).toBe(1);
    expect(clampTravelers(2, 12, 0)).toBe(1);
  });
});

describe("formato (AC5)", () => {
  it("fecha y chip en Lima", () => {
    const d = new Date("2026-11-05T12:30:00Z");
    expect(formatDepartureDate(d)).toBe("jueves 5 de noviembre");
    expect(formatDepartureChip(d)).toEqual({ dow: "Jue", day: "5", month: "nov" });
  });

  it("una hora que en UTC ya es el día siguiente sigue en el día de Lima", () => {
    const d = new Date("2026-11-06T03:00:00Z"); // 22:00 del 5 en Lima
    expect(formatDepartureChip(d).day).toBe("5");
  });

  it("hora de la salida en Lima", () => {
    expect(formatDepartureTime(new Date("2026-11-05T12:30:00Z"))).toBe("7:30 a. m.");
    expect(formatDepartureTime(new Date("2026-11-05T20:05:00Z"))).toBe("3:05 p. m.");
  });

  it("idiomas", () => {
    expect(formatLanguages(["es"])).toBe("Español");
    expect(formatLanguages(["es", "en"])).toBe("Español e inglés");
  });

  it("hora de inicio", () => {
    expect(formatStartTime("07:30:00")).toBe("7:30 a. m.");
    expect(formatStartTime("15:30:00")).toBe("3:30 p. m.");
    expect(formatStartTime("12:00:00")).toBe("12:00 p. m.");
  });

  it("duración de paquete y de tour", () => {
    expect(formatPackageDuration({ kind: "package", durationDays: 4, nights: 3, durationHours: null })).toBe(
      "4 días · 3 noches",
    );
    expect(formatPackageDuration({ kind: "day_tour", durationDays: 1, nights: 0, durationHours: 8 })).toBe(
      "8 horas",
    );
    expect(formatPackageDuration({ kind: "day_tour", durationDays: 1, nights: 0, durationHours: null })).toBe(
      "1 día",
    );
  });

  it("slug válido", () => {
    expect(isValidSlug("machu-picchu-magico")).toBe(true);
    expect(isValidSlug("Machu Picchu")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("resolveBooking (D1)", () => {
  const dep = (id: string, seatsLeft: number) => ({ id, startsAt: new Date(), capacity: 10, seatsLeft });
  const list = [dep("a", 0), dep("b", 3), dep("c", 8)];

  it("usa la primera con cupo por defecto y 2 viajeros", () => {
    expect(resolveBooking(12, list, {})).toMatchObject({ selected: { id: "b" }, travelers: 2 });
  });

  it("respeta ?salida= con cupo e ignora una llena o ajena", () => {
    expect(resolveBooking(12, list, { salida: "c" }).selected?.id).toBe("c");
    expect(resolveBooking(12, list, { salida: "a" }).selected?.id).toBe("b");
    expect(resolveBooking(12, list, { salida: "zzz" }).selected?.id).toBe("b");
  });

  it("acota viajeros al cupo y al grupo", () => {
    expect(resolveBooking(12, list, { salida: "b", viajeros: 9 }).travelers).toBe(3);
    expect(resolveBooking(4, list, { salida: "c", viajeros: 9 }).travelers).toBe(4);
  });

  it("sin salidas con cupo no hay selección", () => {
    expect(resolveBooking(12, [dep("a", 0)], {}).selected).toBeUndefined();
    expect(resolveBooking(12, [], {}).travelers).toBe(2);
  });
});
