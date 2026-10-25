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

export type DurationFilter = "1" | "2-3" | "4-mas";
export type SortOrder = "precio-asc" | "precio-desc"; // ausente = recomendados (D3)

export type PackageFilters = {
  categoria?: string;
  duracion?: DurationFilter;
  destino?: string;
  orden?: SortOrder;
};
