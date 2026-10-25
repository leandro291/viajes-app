export type DestinationDto = {
  id: string;
  slug: string;
  name: string;
  region: string;
  heroImageUrl: string | null;
  packageCount: number; // paquetes publicados
  minPriceCents: number; // mínimo de priceCents de sus paquetes publicados
};
