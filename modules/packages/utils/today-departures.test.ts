import { describe, expect, it } from "vitest";

import type { TodayDepartureRow } from "../types/departure-today";
import { summarizeDepartures } from "./today-departures";

const row = (n: number, over: Partial<TodayDepartureRow> = {}): TodayDepartureRow => ({
  id: `d${n}`,
  packageTitle: `Paquete ${n}`,
  startsAt: new Date(Date.UTC(2026, 9, 28, 12 + (n % 10), 0)),
  capacity: 10,
  bookedSeats: 2,
  status: "scheduled",
  ...over,
});

describe("summarizeDepartures", () => {
  it("AC8: totales sobre todas las filas aunque la lista se limite a 8", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(i, { bookedSeats: i + 1 }));
    const dto = summarizeDepartures(rows);
    expect(dto.items).toHaveLength(8);
    expect(dto.departuresCount).toBe(12);
    expect(dto.travelersCount).toBe(78);
  });

  it("AC8: respeta un limit explícito", () => {
    expect(summarizeDepartures([row(1), row(2), row(3)], 2).items).toHaveLength(2);
  });

  it("AC8: ordena por startsAt asc y desempata por título", () => {
    const t = new Date(Date.UTC(2026, 9, 28, 14, 0));
    const early = row(1, { id: "early", startsAt: new Date(Date.UTC(2026, 9, 28, 13, 0)) });
    const b = row(2, { id: "b", startsAt: t, packageTitle: "Beta" });
    const a = row(3, { id: "a", startsAt: t, packageTitle: "Alfa" });
    expect(summarizeDepartures([b, a, early]).items.map((r) => r.id)).toEqual([
      "early",
      "a",
      "b",
    ]);
  });

  it("AC8: viajeros = suma de bookedSeats", () => {
    const dto = summarizeDepartures([row(1, { bookedSeats: 3 }), row(2, { bookedSeats: 4 })]);
    expect(dto.travelersCount).toBe(7);
  });

  it("AC8: vacío da ceros y lista vacía", () => {
    expect(summarizeDepartures([])).toEqual({
      departuresCount: 0,
      travelersCount: 0,
      items: [],
    });
  });

  it("AC8: no muta la entrada", () => {
    const rows = [row(3), row(1), row(2)];
    const before = rows.map((r) => r.id);
    summarizeDepartures(rows);
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});
