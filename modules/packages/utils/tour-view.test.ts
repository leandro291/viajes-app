import { describe, expect, it } from "vitest";

import {
  formatNextDeparture,
  formatTourCount,
  formatTourDuration,
  formatTourStart,
} from "./tour-view";

describe("tour-view", () => {
  it("AC6: duración en horas", () => {
    expect(formatTourDuration({ durationHours: 14 })).toBe("14 h");
  });

  it("AC6: sin horas cae a '1 día'", () => {
    expect(formatTourDuration({ durationHours: null })).toBe("1 día");
  });

  it("AC6: hora de salida", () => {
    expect(formatTourStart("04:00:00")).toBe("Sale 4:00 a. m.");
    expect(formatTourStart("13:30:00")).toBe("Sale 1:30 p. m.");
  });

  it("AC6: próxima salida en plural", () => {
    // 2026-10-31 12:00 Lima
    const startsAt = new Date("2026-10-31T17:00:00Z");
    expect(formatNextDeparture({ startsAt, seatsLeft: 6 })).toBe(
      "Próxima salida: sáb 31 oct · 6 cupos",
    );
  });

  it("AC6: próxima salida en singular", () => {
    const startsAt = new Date("2026-10-31T17:00:00Z");
    expect(formatNextDeparture({ startsAt, seatsLeft: 1 })).toBe(
      "Próxima salida: sáb 31 oct · 1 cupo",
    );
  });

  it("AC6: el día va en Lima aunque en UTC ya sea el siguiente", () => {
    // 2026-11-01 03:00Z = sáb 31 oct 22:00 Lima
    const startsAt = new Date("2026-11-01T03:00:00Z");
    expect(formatNextDeparture({ startsAt, seatsLeft: 3 })).toBe(
      "Próxima salida: sáb 31 oct · 3 cupos",
    );
  });

  it("AC6: contador singular y plural", () => {
    expect(formatTourCount(1)).toBe("1 tour disponible");
    expect(formatTourCount(0)).toBe("0 tours disponibles");
    expect(formatTourCount(10)).toBe("10 tours disponibles");
  });
});
