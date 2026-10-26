import type { PackageCardDto } from "@/modules/packages";

export type DestinationDto = {
  id: string;
  slug: string;
  name: string;
  region: string;
  heroImageUrl: string | null;
  packageCount: number; // paquetes publicados
  minPriceCents: number; // mínimo de priceCents de sus paquetes publicados
};

export type Season = "dry" | "mixed" | "rainy";
export type ClimateMonthDto = { month: number; season: Season }; // 1..12
export type SightDto = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  lat: number | null;
  lng: number | null;
};
export type FaqDto = { id: string; question: string; answer: string };

export type DestinationDetailDto = {
  id: string;
  slug: string;
  name: string;
  region: string;
  tagline: string | null;
  description: string | null;
  altitudeM: number | null;
  bestSeasonText: string | null;
  fromLimaText: string | null;
  howToGetText: string | null;
  tipsText: string | null;
  heroImageUrl: string | null;
  climate: ClimateMonthDto[]; // por month asc; [] si no hay
  sights: SightDto[]; // por sortOrder asc; [] si no hay
  faqs: FaqDto[]; // por sortOrder asc; [] si no hay
};

export type DestinationPageDto = {
  destination: DestinationDetailDto;
  packages: PackageCardDto[];
  minPriceCents: number; // mínimo de priceCents de `packages` (≥ 1 elemento)
};
