import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("own-departure-service (db)", () => {
  const userIds = [
    "00000000-0000-4000-8000-000000220001",
    "00000000-0000-4000-8000-000000220002",
  ];
  const orgIds = [
    "00000000-0000-4000-8000-000000220011",
    "00000000-0000-4000-8000-000000220012",
  ];
  const DEST_ID = "00000000-0000-4000-8000-000000220021";
  const pkgIds = [
    "00000000-0000-4000-8000-000000220031", // mío, publicado
    "00000000-0000-4000-8000-000000220032", // mío, borrador
    "00000000-0000-4000-8000-000000220033", // ajeno
  ];
  const guideIds = [
    "00000000-0000-4000-8000-000000220041", // mía
    "00000000-0000-4000-8000-000000220042", // ajena
  ];
  const dep = (n: number) => `00000000-0000-4000-8000-0000002200${50 + n}`;

  let svc: typeof import("./own-departure-service");
  let dbModule: typeof import("@/lib/db");

  const cleanup = async () => {
    const {
      db,
      departures,
      destinations,
      guides,
      organizers,
      packages,
      users,
    } = dbModule;
    await db.delete(departures).where(inArray(departures.packageId, pkgIds));
    await db.delete(packages).where(inArray(packages.id, pkgIds));
    await db.delete(guides).where(inArray(guides.id, guideIds));
    await db.delete(destinations).where(eq(destinations.id, DEST_ID));
    await db.delete(organizers).where(inArray(organizers.id, orgIds));
    await db.delete(users).where(inArray(users.id, userIds));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./own-departure-service");
    await cleanup();
    const {
      db,
      departures,
      destinations,
      guides,
      organizers,
      packages,
      users,
    } = dbModule;
    await db.insert(users).values(
      userIds.map((id, i) => ({
        id,
        clerkId: `test_own_departure_service_${i}`,
        email: `test-own-departure-service-${i}@example.invalid`,
        role: "organizer" as const,
      })),
    );
    await db.insert(organizers).values(
      orgIds.map((id, i) => ({
        id,
        userId: userIds[i],
        businessName: `Operador de prueba salidas ${i}`,
        ruc: "20000000000",
        whatsapp: "+51900000000",
        status: "active" as const,
      })),
    );
    await db.insert(destinations).values({
      id: DEST_ID,
      slug: "test-own-departure-service",
      name: "Destino de prueba",
      region: "Región de prueba",
    });
    const base = {
      destinationId: DEST_ID,
      kind: "package" as const,
      blurb: "Prueba",
      durationDays: 2,
      nights: 1,
      priceCents: 10000,
      languages: ["es"],
    };
    await db.insert(packages).values([
      {
        ...base,
        id: pkgIds[0],
        organizerId: orgIds[0],
        slug: "test-own-departure-service-b",
        title: "Beta publicado",
        maxGroupSize: 12,
        status: "published" as const,
      },
      {
        ...base,
        id: pkgIds[1],
        organizerId: orgIds[0],
        slug: "test-own-departure-service-a",
        title: "Alfa borrador",
        maxGroupSize: 8,
        status: "draft" as const,
      },
      {
        ...base,
        id: pkgIds[2],
        organizerId: orgIds[1],
        slug: "test-own-departure-service-c",
        title: "Ajeno",
        maxGroupSize: 5,
        status: "published" as const,
      },
    ]);
    await db.insert(guides).values([
      {
        id: guideIds[0],
        organizerId: orgIds[0],
        name: "Guía propia",
        phone: "+51900000001",
      },
      {
        id: guideIds[1],
        organizerId: orgIds[1],
        name: "Guía ajena",
        phone: "+51900000002",
      },
    ]);
    const at = (iso: string) => new Date(iso);
    await db.insert(departures).values([
      // abiertas: orden esperado por fecha asc -> 1, 2, 3
      {
        id: dep(2),
        packageId: pkgIds[0],
        startsAt: at("2099-03-01T12:00:00Z"),
        capacity: 10,
        bookedSeats: 4,
        status: "en_route",
      },
      {
        id: dep(1),
        packageId: pkgIds[0],
        startsAt: at("2099-02-01T12:00:00Z"),
        capacity: 10,
        guideId: guideIds[0],
      },
      {
        id: dep(3),
        packageId: pkgIds[1],
        startsAt: at("2099-04-01T12:00:00Z"),
        capacity: 8,
      },
      // cerradas: orden esperado por fecha desc -> 5, 4
      {
        id: dep(4),
        packageId: pkgIds[0],
        startsAt: at("2098-01-01T12:00:00Z"),
        capacity: 10,
        bookedSeats: 10,
        status: "completed",
      },
      {
        id: dep(5),
        packageId: pkgIds[0],
        startsAt: at("2098-06-01T12:00:00Z"),
        capacity: 10,
        status: "cancelled",
      },
      // ajena
      {
        id: dep(6),
        packageId: pkgIds[2],
        startsAt: at("2099-01-01T12:00:00Z"),
        capacity: 5,
      },
    ]);
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  it("AC7: listOwnDepartures solo devuelve salidas de paquetes del operador", async () => {
    const mine = await svc.listOwnDepartures(orgIds[0]);
    expect(mine.map((d) => d.id)).not.toContain(dep(6));
    expect(mine).toHaveLength(5);
    const other = await svc.listOwnDepartures(orgIds[1]);
    expect(other.map((d) => d.id)).toEqual([dep(6)]);
  });

  it("AC7: orden abiertas por fecha asc y luego cerradas por fecha desc", async () => {
    const mine = await svc.listOwnDepartures(orgIds[0]);
    expect(mine.map((d) => d.id)).toEqual([
      dep(1),
      dep(2),
      dep(3),
      dep(5),
      dep(4),
    ]);
  });

  it("AC7: devuelve título y estado del paquete, cupos, estado y guía (o null)", async () => {
    const mine = await svc.listOwnDepartures(orgIds[0]);
    const byId = new Map(mine.map((d) => [d.id, d]));
    expect(byId.get(dep(1))).toEqual({
      id: dep(1),
      packageId: pkgIds[0],
      packageTitle: "Beta publicado",
      packageStatus: "published",
      startsAt: new Date("2099-02-01T12:00:00Z"),
      capacity: 10,
      bookedSeats: 0,
      status: "scheduled",
      guideId: guideIds[0],
      guideName: "Guía propia",
    });
    expect(byId.get(dep(2))).toMatchObject({
      bookedSeats: 4,
      status: "en_route",
      guideId: null,
      guideName: null,
    });
    expect(byId.get(dep(3))).toMatchObject({
      packageTitle: "Alfa borrador",
      packageStatus: "draft",
    });
  });

  it("AC7: operador sin salidas -> lista vacía", async () => {
    expect(
      await svc.listOwnDepartures("00000000-0000-4000-8000-0000002200ff"),
    ).toEqual([]);
  });

  it("AC8: getDepartureFormOptions devuelve paquetes propios por título (cualquier estado) y guías propias", async () => {
    const opts = await svc.getDepartureFormOptions(orgIds[0]);
    expect(opts.packages).toEqual([
      { id: pkgIds[1], title: "Alfa borrador", maxGroupSize: 8 },
      { id: pkgIds[0], title: "Beta publicado", maxGroupSize: 12 },
    ]);
    expect(opts.guides).toEqual([
      { id: guideIds[0], name: "Guía propia", phone: "+51900000001" },
    ]);
  });

  it("AC8: no filtra paquetes ni guías de otro operador", async () => {
    const opts = await svc.getDepartureFormOptions(orgIds[1]);
    expect(opts.packages.map((p) => p.id)).toEqual([pkgIds[2]]);
    expect(opts.guides.map((g) => g.id)).toEqual([guideIds[1]]);
  });
});
