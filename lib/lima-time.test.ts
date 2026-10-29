import { describe, expect, it } from "vitest";

import { limaDayRange, limaMonthRange } from "./lima-time";

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
