export type CategoryDto = { id: string; slug: string; name: string };

export type PackageCardDto = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  kind: "package" | "day_tour";
  durationDays: number;
  priceCents: number; // por persona; el catálogo es siempre PEN
  coverImageUrl: string | null;
  destination: { slug: string; name: string; region: string };
  categories: { slug: string; name: string }[]; // ordenadas por name
};
