import { describe, expect, it } from "vitest";

import type { DestinationInput } from "../schemas/destination-schema";
import { toChildRows, toDestinationRow } from "./destination-write";

const base: DestinationInput = {
  name: "Cusco",
  region: "Cusco",
  heroImageUrl: "/seed/cusco.jpg",
  tagline: null,
  description: null,
  altitudeM: 3400,
  bestSeasonText: null,
  fromLimaText: null,
  howToGetText: null,
  tipsText: null,
  climate: Array(12).fill(null),
  sights: [],
  faqs: [],
};

describe("toDestinationRow", () => {
  it("AC15: no incluye id ni slug", () => {
    const row = toDestinationRow({ ...base, name: "Otro" });
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("slug");
    expect(row).toMatchObject({ name: "Otro", altitudeM: 3400, heroImageUrl: "/seed/cusco.jpg" });
  });
});

describe("toChildRows", () => {
  it("AC14: sin clima, lugares ni preguntas -> arreglos vacíos", () => {
    expect(toChildRows("d1", base)).toEqual({ climate: [], sights: [], faqs: [] });
  });

  it("AC14: clima con month 1..12", () => {
    const climate = Array.from({ length: 12 }, (_, i) => (i % 2 ? "rainy" : "dry")) as DestinationInput["climate"];
    const { climate: rows } = toChildRows("d1", { ...base, climate });
    expect(rows.map((r) => r.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(rows[0]).toEqual({ destinationId: "d1", month: 1, season: "dry" });
    expect(rows[1].season).toBe("rainy");
  });

  it("AC14: sortOrder 0..n por el orden de la lista", () => {
    const { sights, faqs } = toChildRows("d1", {
      ...base,
      sights: [
        { name: "A", description: "x", imageUrl: "/seed/a.jpg", lat: -13.5, lng: -71.9 },
        { name: "B", description: "y", imageUrl: "/seed/b.jpg", lat: null, lng: null },
      ],
      faqs: [
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "A2" },
        { question: "Q3", answer: "A3" },
      ],
    });
    expect(sights.map((s) => [s.name, s.sortOrder])).toEqual([["A", 0], ["B", 1]]);
    expect(sights[0]).toMatchObject({ destinationId: "d1", lat: -13.5, lng: -71.9 });
    expect(faqs.map((f) => f.sortOrder)).toEqual([0, 1, 2]);
  });
});
