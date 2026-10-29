import { describe, expect, it } from "vitest";

import {
  formatDepartureChip,
  formatDepartureDate,
  formatDepartureShortDate,
  formatDepartureTime,
  formatStartTime,
} from "./lima-date";

describe("lima-date (AC5)", () => {
  it("fecha y chip en Lima", () => {
    const d = new Date("2026-11-05T12:30:00Z");
    expect(formatDepartureDate(d)).toBe("jueves 5 de noviembre");
    expect(formatDepartureChip(d)).toEqual({ dow: "Jue", day: "5", month: "nov" });
  });

  it("una hora que en UTC ya es el día siguiente sigue en el día de Lima", () => {
    const d = new Date("2026-11-06T03:00:00Z"); // 22:00 del 5 en Lima
    expect(formatDepartureChip(d).day).toBe("5");
  });

  it("AC5: fecha corta en Lima", () => {
    expect(formatDepartureShortDate(new Date("2026-11-05T12:30:00Z"))).toBe("Jue 5 nov 2026");
    // 02:00 UTC del 6 nov = 21:00 del 5 en Lima
    expect(formatDepartureShortDate(new Date("2026-11-06T02:00:00Z"))).toBe("Jue 5 nov 2026");
  });

  it("AC5: fecha corta de setiembre usa la abreviatura real de Intl", () => {
    const d = new Date("2026-09-15T12:00:00Z");
    const month = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", month: "long" })
      .format(d)
      .slice(0, 3)
      .toLowerCase();
    expect(formatDepartureShortDate(d)).toBe(`Mar 15 ${month} 2026`);
  });

  it("hora de la salida en Lima", () => {
    expect(formatDepartureTime(new Date("2026-11-05T12:30:00Z"))).toBe("7:30 a. m.");
    expect(formatDepartureTime(new Date("2026-11-05T20:05:00Z"))).toBe("3:05 p. m.");
  });

  it("hora de inicio", () => {
    expect(formatStartTime("07:30:00")).toBe("7:30 a. m.");
    expect(formatStartTime("15:30:00")).toBe("3:30 p. m.");
    expect(formatStartTime("12:00:00")).toBe("12:00 p. m.");
  });
});
