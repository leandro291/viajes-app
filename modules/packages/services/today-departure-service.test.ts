import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("today-departure-service (db)", () => {
  const USER_ID = "00000000-0000-4000-8000-000000250501";
  const ORG_ID = "00000000-0000-4000-8000-000000250511";
  const DEST_ID = "00000000-0000-4000-8000-000000250521";
  const PKG_ID = "00000000-0000-4000-8000-000000250531";
  const dep = (n: number) => `00000000-0000-4000-8000-0000002505${40 + n}`;
  const depIds = [dep(1), dep(2), dep(3), dep(4)];

  // Año 2001: rango propio que no choca con datos reales ni del seed.
  const range = {
    from: new Date("2001-03-10T05:00:00.000Z"),
    to: new Date("2001-03-11T05:00:00.000Z"),
  };

  let svc: typeof import("./today-departure-service");
  let dbModule: typeof import("@/lib/db");

  const cleanup = async () => {
    const { db, departures, destinations, organizers, packages, users } = dbModule;
    await db.delete(departures).where(inArray(departures.id, depIds));
    await db.delete(packages).where(eq(packages.id, PKG_ID));
    await db.delete(destinations).where(eq(destinations.id, DEST_ID));
    await db.delete(organizers).where(eq(organizers.id, ORG_ID));
    await db.delete(users).where(eq(users.id, USER_ID));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./today-departure-service");
    await cleanup();
    const { db, departures, destinations, organizers, packages, users } = dbModule;
    await db.insert(users).values({
      id: USER_ID,
      clerkId: "test_today_departure_service",
      email: "test-today-departure-service@example.invalid",
      role: "organizer" as const,
    });
    await db.insert(organizers).values({
      id: ORG_ID,
      userId: USER_ID,
      businessName: "Operador de prueba salidas de hoy",
      ruc: "20000000000",
      whatsapp: "+51900000000",
      status: "active" as const,
    });
    await db.insert(destinations).values({
      id: DEST_ID,
      slug: "test-today-departure-service",
      name: "Destino de prueba",
      region: "Región de prueba",
    });
    await db.insert(packages).values({
      id: PKG_ID,
      organizerId: ORG_ID,
      destinationId: DEST_ID,
      kind: "package" as const,
      slug: "test-today-departure-service",
      title: "Paquete salidas de hoy",
      blurb: "Prueba",
      durationDays: 2,
      nights: 1,
      priceCents: 10000,
      maxGroupSize: 12,
      languages: ["es"],
      status: "published" as const,
    });
    await db.insert(departures).values([
      // dentro del rango
      { id: depIds[0], packageId: PKG_ID, startsAt: new Date("2001-03-10T13:00:00.000Z"), capacity: 10, bookedSeats: 3, status: "scheduled" as const },
      { id: depIds[1], packageId: PKG_ID, startsAt: new Date("2001-03-10T15:00:00.000Z"), capacity: 10, bookedSeats: 4, status: "completed" as const },
      // dentro pero cancelada
      { id: depIds[2], packageId: PKG_ID, startsAt: new Date("2001-03-10T17:00:00.000Z"), capacity: 10, bookedSeats: 5, status: "cancelled" as const },
      // exactamente en `to`: fuera ([from, to))
      { id: depIds[3], packageId: PKG_ID, startsAt: range.to, capacity: 10, bookedSeats: 6, status: "scheduled" as const },
    ]);
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  it("AC8: rango vacío -> ceros", async () => {
    const dto = await svc.getTodayDepartures({
      from: new Date("1990-01-01T00:00:00.000Z"),
      to: new Date("1990-01-02T00:00:00.000Z"),
    });
    expect(dto).toEqual({ departuresCount: 0, travelersCount: 0, items: [] });
  });

  it("AC8: excluye cancelled y cuenta completed", async () => {
    const dto = await svc.getTodayDepartures(range);
    expect(dto.items.map((r) => r.id)).toEqual([depIds[0], depIds[1]]);
    expect(dto.departuresCount).toBe(2);
    expect(dto.travelersCount).toBe(7);
    expect(dto.items[0]).toMatchObject({ packageTitle: "Paquete salidas de hoy", capacity: 10, bookedSeats: 3 });
  });

  it("AC8: solo starts_at dentro de [from, to)", async () => {
    const next = await svc.getTodayDepartures({
      from: range.to,
      to: new Date("2001-03-12T05:00:00.000Z"),
    });
    expect(next.items.map((r) => r.id)).toEqual([depIds[3]]);
  });
});
