import { describe, expect, it } from "vitest";
import {
  CHIP_ALL,
  CHIP_DAY,
  buildCategoryChips,
  filterByChip,
  type RailCard,
} from "./category-chips";

const card = (slug: string, categorySlugs: string[], isDayTour = false): RailCard => ({
  slug,
  title: slug,
  coverImageUrl: null,
  regionLabel: "Cusco",
  tag: null,
  durationLabel: "4 días",
  priceLabel: "S/ 100",
  categorySlugs,
  isDayTour,
});

const categories = [
  { slug: "naturaleza", name: "Naturaleza" },
  { slug: "aventura", name: "Aventura" },
  { slug: "cultura", name: "Cultura" },
  { slug: "gastronomia", name: "Gastronomía" },
];

describe("buildCategoryChips", () => {
  it("AC9: lista vacía devuelve []", () => {
    expect(buildCategoryChips([], categories)).toEqual([]);
  });

  it("AC9: Todos + categorías presentes ordenadas por nombre, sin chips vacíos", () => {
    const cards = [card("a", ["naturaleza"]), card("b", ["aventura", "naturaleza"])];
    expect(buildCategoryChips(cards, categories)).toEqual([
      { key: CHIP_ALL, label: "Todos" },
      { key: "aventura", label: "Aventura" },
      { key: "naturaleza", label: "Naturaleza" },
    ]);
  });

  it("AC9: orden es-locale (tildes) por nombre", () => {
    const cats = [
      { slug: "z", name: "Zona" },
      { slug: "e", name: "Épica" },
      { slug: "a", name: "Aventura" },
    ];
    const cards = [card("x", ["z", "e", "a"])];
    expect(buildCategoryChips(cards, cats).map((c) => c.label)).toEqual([
      "Todos",
      "Aventura",
      "Épica",
      "Zona",
    ]);
  });

  it("AC9: Un día solo si alguna tarjeta es isDayTour, y va al final", () => {
    const withDay = [card("a", ["cultura"], true), card("b", ["aventura"])];
    const chips = buildCategoryChips(withDay, categories);
    expect(chips.at(-1)).toEqual({ key: CHIP_DAY, label: "Un día" });
    expect(chips.map((c) => c.key)).toEqual([CHIP_ALL, "aventura", "cultura", CHIP_DAY]);

    const noDay = buildCategoryChips([card("a", ["cultura"])], categories);
    expect(noDay.some((c) => c.key === CHIP_DAY)).toBe(false);
  });

  it("AC9: tarjetas sin categorías dan solo Todos (y Un día si aplica)", () => {
    expect(buildCategoryChips([card("a", [])], categories)).toEqual([
      { key: CHIP_ALL, label: "Todos" },
    ]);
    expect(buildCategoryChips([card("a", [], true)], categories).map((c) => c.key)).toEqual([
      CHIP_ALL,
      CHIP_DAY,
    ]);
  });

  it("AC9: ignora slugs de tarjeta que no están en categories", () => {
    expect(buildCategoryChips([card("a", ["desconocida"])], categories)).toEqual([
      { key: CHIP_ALL, label: "Todos" },
    ]);
  });
});

describe("filterByChip", () => {
  const cards = [card("a", ["aventura"], true), card("b", ["cultura"]), card("c", [])];

  it("AC9: all devuelve todas", () => {
    expect(filterByChip(cards, CHIP_ALL)).toEqual(cards);
  });

  it("AC9: day devuelve las isDayTour", () => {
    expect(filterByChip(cards, CHIP_DAY).map((c) => c.slug)).toEqual(["a"]);
  });

  it("AC9: slug de categoría devuelve las que la tienen", () => {
    expect(filterByChip(cards, "cultura").map((c) => c.slug)).toEqual(["b"]);
    expect(filterByChip(cards, "nada")).toEqual([]);
  });
});
