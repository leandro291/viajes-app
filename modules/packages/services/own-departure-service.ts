import { asc, eq, sql } from "drizzle-orm";

import { db, departures, guides, packages } from "@/lib/db";

import type { GuideDto } from "../schemas/guide-schema";
import type { DepartureStatus } from "../utils/departure-rules";
import { listGuides } from "./guide-service";

// Lecturas del panel del operador: dinámicas (sin "use cache"). `departures` no tiene
// organizer_id: el dueño es packages.organizer_id, así que todo pasa por el join.

export type OwnDepartureItem = {
  id: string;
  packageId: string;
  packageTitle: string;
  packageStatus: "draft" | "published";
  startsAt: Date;
  capacity: number;
  bookedSeats: number;
  status: DepartureStatus;
  guideId: string | null;
  guideName: string | null;
};

export type DepartureFormOptions = {
  packages: { id: string; title: string; maxGroupSize: number }[];
  guides: GuideDto[];
};

// Abiertas (scheduled/en_route) primero por fecha asc; cerradas (completed/cancelled) por fecha desc.
const isOpen = sql`${departures.status} in ('scheduled', 'en_route')`;
const MAX_ROWS = 500;

export async function listOwnDepartures(
  organizerId: string,
): Promise<OwnDepartureItem[]> {
  return (
    db
      .select({
        id: departures.id,
        packageId: departures.packageId,
        packageTitle: packages.title,
        packageStatus: packages.status,
        startsAt: departures.startsAt,
        capacity: departures.capacity,
        bookedSeats: departures.bookedSeats,
        status: departures.status,
        guideId: departures.guideId,
        guideName: guides.name,
      })
      .from(departures)
      .innerJoin(packages, eq(packages.id, departures.packageId))
      .leftJoin(guides, eq(guides.id, departures.guideId))
      .where(eq(packages.organizerId, organizerId))
      .orderBy(
        sql`case when ${isOpen} then 0 else 1 end`,
        sql`case when ${isOpen} then ${departures.startsAt} end asc`,
        sql`case when ${isOpen} then null else ${departures.startsAt} end desc`,
        asc(departures.id),
      )
      // ponytail: sin paginación, tope de 500 filas; paginar/filtrar por paquete si un operador lo supera.
      .limit(MAX_ROWS)
  );
}

export async function getDepartureFormOptions(
  organizerId: string,
): Promise<DepartureFormOptions> {
  const [pkgs, ownGuides] = await Promise.all([
    db
      .select({
        id: packages.id,
        title: packages.title,
        maxGroupSize: packages.maxGroupSize,
      })
      .from(packages)
      .where(eq(packages.organizerId, organizerId))
      .orderBy(asc(packages.title), asc(packages.id)),
    listGuides(organizerId),
  ]);
  return { packages: pkgs, guides: ownGuides };
}
