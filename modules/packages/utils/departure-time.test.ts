import { describe, expect, it } from "vitest";

import { instantToLimaParts, limaToInstant } from "./departure-time";

describe("departure-time", () => {
  it("AC3: limaToInstant convierte hora de Lima a UTC (+5h)", () => {
    expect(limaToInstant("2026-11-05", "07:30")?.toISOString()).toBe("2026-11-05T12:30:00.000Z");
  });

  it("AC3: cerca de medianoche UTC cruza de día", () => {
    expect(limaToInstant("2026-11-05", "19:00")?.toISOString()).toBe("2026-11-06T00:00:00.000Z");
    expect(limaToInstant("2026-11-05", "23:59")?.toISOString()).toBe("2026-11-06T04:59:00.000Z");
    expect(limaToInstant("2026-12-31", "20:00")?.toISOString()).toBe("2027-01-01T01:00:00.000Z");
  });

  it("AC3: instantToLimaParts es el inverso exacto (round-trip)", () => {
    for (const [date, time] of [
      ["2026-11-05", "07:30"],
      ["2026-11-05", "00:00"],
      ["2026-11-05", "19:00"],
      ["2026-12-31", "23:59"],
      ["2028-02-29", "04:59"],
    ]) {
      const instant = limaToInstant(date, time);
      expect(instant).not.toBeNull();
      expect(instantToLimaParts(instant!)).toEqual({ date, time });
    }
  });

  it("AC3: instantToLimaParts usa el día de Lima, no el UTC", () => {
    expect(instantToLimaParts(new Date("2026-11-06T02:00:00.000Z"))).toEqual({
      date: "2026-11-05",
      time: "21:00",
    });
  });

  it("AC3: fechas y horas inexistentes devuelven null (no se ruedan)", () => {
    expect(limaToInstant("2026-02-30", "10:00")).toBeNull();
    expect(limaToInstant("2026-13-01", "10:00")).toBeNull();
    expect(limaToInstant("2026-00-10", "10:00")).toBeNull();
    expect(limaToInstant("2026-04-31", "10:00")).toBeNull();
    expect(limaToInstant("2026-11-05", "24:00")).toBeNull();
    expect(limaToInstant("2026-11-05", "10:60")).toBeNull();
  });

  it("AC3: formatos inválidos devuelven null", () => {
    expect(limaToInstant("", "10:00")).toBeNull();
    expect(limaToInstant("2026-11-05", "")).toBeNull();
    expect(limaToInstant("5/11/2026", "10:00")).toBeNull();
    expect(limaToInstant("2026-11-05", "7:30")).toBeNull();
  });

  it("AC3: 2026-02-29 no existe, 2028-02-29 sí", () => {
    expect(limaToInstant("2026-02-29", "10:00")).toBeNull();
    expect(limaToInstant("2028-02-29", "10:00")).not.toBeNull();
  });
});
