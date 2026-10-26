import { isValidSlug } from "@/lib/slug";
import { getPackages } from "@/modules/packages";

import type { DestinationPageDto } from "../types/destination";
import { getDestinationBySlug } from "./destination-detail-service";

/** Destino + sus paquetes publicados. `null` si el slug es inválido, no existe o no tiene paquetes. */
export async function getDestinationPage(slug: string): Promise<DestinationPageDto | null> {
  if (!isValidSlug(slug)) return null;

  const [destination, packages] = await Promise.all([
    getDestinationBySlug(slug),
    getPackages({ destino: slug }),
  ]);
  if (!destination || packages.length === 0) return null;

  return {
    destination,
    packages,
    minPriceCents: Math.min(...packages.map((p) => p.priceCents)),
  };
}
