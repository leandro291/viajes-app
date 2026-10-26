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

export type TourSort = "precio-asc" | "mas-cortos"; // ausente = recomendados (D4)

export type TourFilters = {
  ciudad?: string;
  fecha?: string; // YYYY-MM-DD, día de Lima
  orden?: TourSort;
};

export type TourCardDto = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  priceCents: number; // por persona, PEN
  coverImageUrl: string | null;
  durationHours: number | null;
  startTime: string | null; // "04:00:00" tal cual la BD
  destination: { slug: string; name: string; region: string };
  nextDeparture: { startsAt: Date; seatsLeft: number } | null; // D2
};

export type TourCityDto = { slug: string; name: string; count: number };

export type PackageImageDto = { url: string; alt: string | null; credit: string | null };

export type ItineraryDayDto = {
  dayNumber: number;
  title: string;
  description: string;
  place: string;
  transportLeg: string | null;
  imageUrl: string | null;
};

export type PackageDetailDto = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  description: string | null;
  kind: "package" | "day_tour";
  durationDays: number;
  nights: number;
  durationHours: number | null;
  startTime: string | null; // "07:30:00" tal cual la BD
  priceCents: number; // por persona, habitación doble
  maxGroupSize: number;
  languages: string[];
  meetingPoint: string | null;
  coverImageUrl: string | null;
  destination: { slug: string; name: string; region: string };
  images: PackageImageDto[]; // por sort_order; [] si no hay
  itinerary: ItineraryDayDto[]; // por day_number; [] si no hay
  inclusions: { included: string[]; excluded: string[] }; // por sort_order
};

export type DepartureDto = { id: string; startsAt: Date; capacity: number; seatsLeft: number };

export type DetailParams = { salida?: string; viajeros?: number };
