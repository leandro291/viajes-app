import type { DestinationInput } from "../schemas/destination-schema";

export type DestinationAdminItem = {
  id: string;
  slug: string;
  name: string;
  region: string;
  heroImageUrl: string | null;
  packageCount: number;
  publishedCount: number;
  sightCount: number;
};

export type DestinationEdit = { id: string; slug: string; values: DestinationInput };
