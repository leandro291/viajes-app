import { describe, expect, it } from "vitest";

import { rankTopDestinations } from "./top-destinations";

const row = (name: string, bookingsCount: number, revenueCents = 0) => ({
  id: name,
  slug: name.toLowerCase(),
  name,
  bookingsCount,
  revenueCents,
});

describe("rankTopDestinations", () => {
  it("AC7: ordena por reservas desc", () => {
    const r = rankTopDestinations([row("A", 1), row("B", 3), row("C", 2)]);
    expect(r.map((d) => d.name)).toEqual(["B", "C", "A"]);
  });

  it("AC7: desempata por ingresos desc y luego por nombre asc (acentos, es)", () => {
    const r = rankTopDestinations([
      row("Zorro", 2, 100),
      row("Ñandú", 2, 100),
      row("Álamo", 2, 100),
      row("Rico", 2, 500),
    ]);
    expect(r.map((d) => d.name)).toEqual(["Rico", "Álamo", "Ñandú", "Zorro"]);
  });

  it("AC7: descarta destinos sin reservas", () => {
    expect(rankTopDestinations([row("A", 0), row("B", 1)]).map((d) => d.name)).toEqual(["B"]);
  });

  it("AC7: límite por defecto 5 y personalizado", () => {
    const rows = Array.from({ length: 8 }, (_, i) => row(`D${i}`, i + 1));
    expect(rankTopDestinations(rows)).toHaveLength(5);
    expect(rankTopDestinations(rows, 2).map((d) => d.name)).toEqual(["D7", "D6"]);
  });

  it("AC7: lista vacía", () => {
    expect(rankTopDestinations([])).toEqual([]);
  });

  it("AC7: no muta la entrada", () => {
    const rows = [row("A", 1), row("B", 2)];
    rankTopDestinations(rows);
    expect(rows.map((d) => d.name)).toEqual(["A", "B"]);
  });
});
