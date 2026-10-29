import { describe, expect, it } from "vitest";

import { instantToLimaParts, limaDayRange, limaMonthRange, limaToInstant } from "./lima-time";

const iso = (r: { from: Date; to: Date }) => [r.from.toISOString(), r.to.toISOString()];

describe("limaMonthRange", () => {
  it("AC9: mes de octubre 2026", () => {
    expect(iso(limaMonthRange(new Date("2026-10-28T12:00:00Z")))).toEqual([
      "2026-10-01T05:00:00.000Z",
      "2026-11-01T05:00:00.000Z",
    ]);
  });

  it("AC9: 04:59:59Z del 1 de noviembre aún es octubre; 05:00:00Z ya es noviembre", () => {
    expect(limaMonthRange(new Date("2026-11-01T04:59:59Z")).from.toISOString()).toBe(
      "2026-10-01T05:00:00.000Z",
    );
    expect(limaMonthRange(new Date("2026-11-01T05:00:00Z")).from.toISOString()).toBe(
      "2026-11-01T05:00:00.000Z",
    );
  });

  it("AC9: diciembre pasa a enero del año siguiente", () => {
    expect(iso(limaMonthRange(new Date("2026-12-15T12:00:00Z")))).toEqual([
      "2026-12-01T05:00:00.000Z",
      "2027-01-01T05:00:00.000Z",
    ]);
  });

  it("AC9: febrero bisiesto tiene 29 días", () => {
    const { from, to } = limaMonthRange(new Date("2028-02-10T12:00:00Z"));
    expect((to.getTime() - from.getTime()) / 86_400_000).toBe(29);
  });

  it("AC9: el to de un mes es el from del siguiente", () => {
    const a = limaMonthRange(new Date("2026-10-28T12:00:00Z"));
    expect(limaMonthRange(a.to).from).toEqual(a.to);
  });
});

describe("limaDayRange", () => {
  it("AC9: día 28 de octubre 2026", () => {
    expect(iso(limaDayRange(new Date("2026-10-28T12:00:00Z")))).toEqual([
      "2026-10-28T05:00:00.000Z",
      "2026-10-29T05:00:00.000Z",
    ]);
  });

  it("AC9: 04:59Z aún es el día anterior en Lima", () => {
    expect(limaDayRange(new Date("2026-10-28T04:59:00Z")).from.toISOString()).toBe(
      "2026-10-27T05:00:00.000Z",
    );
  });

  it("AC9: el instante exacto 05:00Z abre el día; to es exclusivo", () => {
    const r = limaDayRange(new Date("2026-10-28T05:00:00Z"));
    expect(r.from.toISOString()).toBe("2026-10-28T05:00:00.000Z");
    expect(limaDayRange(r.to).from).toEqual(r.to);
  });
});

describe("lima-time", () => {
  it("AC1: limaToInstant convierte hora de Lima a UTC (+5h)", () => {
    expect(limaToInstant("2026-11-05", "07:30")?.toISOString()).toBe("2026-11-05T12:30:00.000Z");
  });

  it("AC1: cerca de medianoche UTC cruza de día", () => {
    expect(limaToInstant("2026-11-05", "19:00")?.toISOString()).toBe("2026-11-06T00:00:00.000Z");
    expect(limaToInstant("2026-11-05", "23:59")?.toISOString()).toBe("2026-11-06T04:59:00.000Z");
    expect(limaToInstant("2026-12-31", "20:00")?.toISOString()).toBe("2027-01-01T01:00:00.000Z");
  });

  it("AC1: instantToLimaParts es el inverso exacto (round-trip)", () => {
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

  it("AC1: instantToLimaParts usa el día de Lima, no el UTC", () => {
    expect(instantToLimaParts(new Date("2026-11-06T02:00:00.000Z"))).toEqual({
      date: "2026-11-05",
      time: "21:00",
    });
  });

  it("AC1: instantToLimaParts 04:59Z es 23:59 del día anterior en Lima", () => {
    expect(instantToLimaParts(new Date("2026-12-01T04:59:00.000Z"))).toEqual({
      date: "2026-11-30",
      time: "23:59",
    });
  });

  it("AC1: fechas y horas inexistentes devuelven null (no se ruedan)", () => {
    expect(limaToInstant("2026-02-30", "10:00")).toBeNull();
    expect(limaToInstant("2026-13-01", "10:00")).toBeNull();
    expect(limaToInstant("2026-00-10", "10:00")).toBeNull();
    expect(limaToInstant("2026-04-31", "10:00")).toBeNull();
    expect(limaToInstant("2026-11-05", "24:00")).toBeNull();
    expect(limaToInstant("2026-11-05", "10:60")).toBeNull();
  });

  it("AC1: formatos inválidos devuelven null", () => {
    expect(limaToInstant("", "10:00")).toBeNull();
    expect(limaToInstant("2026-11-05", "")).toBeNull();
    expect(limaToInstant("5/11/2026", "10:00")).toBeNull();
    expect(limaToInstant("2026-11-05", "7:30")).toBeNull();
  });

  it("AC1: 2026-02-29 no existe, 2028-02-29 sí", () => {
    expect(limaToInstant("2026-02-29", "10:00")).toBeNull();
    expect(limaToInstant("2028-02-29", "10:00")).not.toBeNull();
  });
});
