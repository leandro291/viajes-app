export const CHIP_ALL = "all";
export const CHIP_DAY = "day";

export type CategoryChip = { key: string; label: string };

export type RailCard = {
  slug: string;
  title: string;
  coverImageUrl: string | null;
  regionLabel: string;
  tag: string | null;
  durationLabel: string;
  priceLabel: string;
  categorySlugs: string[];
  isDayTour: boolean;
};

export function buildCategoryChips(
  cards: RailCard[],
  categories: { slug: string; name: string }[],
): CategoryChip[] {
  if (cards.length === 0) return [];

  const present = new Set(cards.flatMap((c) => c.categorySlugs));
  const chips: CategoryChip[] = [{ key: CHIP_ALL, label: "Todos" }];

  categories
    .filter((c) => present.has(c.slug))
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .forEach((c) => chips.push({ key: c.slug, label: c.name }));

  if (cards.some((c) => c.isDayTour)) chips.push({ key: CHIP_DAY, label: "Un día" });
  return chips;
}

export function filterByChip(cards: RailCard[], key: string): RailCard[] {
  if (key === CHIP_ALL) return cards;
  if (key === CHIP_DAY) return cards.filter((c) => c.isDayTour);
  return cards.filter((c) => c.categorySlugs.includes(key));
}
