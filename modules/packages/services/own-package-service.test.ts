import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// getCategories usa "use cache": se mockea next/cache (como package-detail-service.test.ts).
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("own-package-service (db)", () => {
  const id = (n: number) => `00000000-0000-4000-8000-0000002200${n.toString(16).padStart(2, "0")}`;
  const userIds = [id(1), id(2)];
  const orgIds = [id(3), id(4)];
  const DEST_ID = id(5);
  const CAT_IDS = [id(6), id(7)]; // "Cat A" < "Cat B" por nombre
  const PKG_FULL = id(0x10);
  const PKG_DRAFT = id(0x11);
  const PKG_OTHER = id(0x12);
  const pkgIds = [PKG_FULL, PKG_DRAFT, PKG_OTHER];
  const DEP_IDS = [id(0x20), id(0x21)];
  const [mine, other] = orgIds;
  const scopeOf = (orgId: string) => ({ id: orgId, status: "active" as const });

  let svc: typeof import("./own-package-service");
  let dbModule: typeof import("@/lib/db");

  const cleanup = async () => {
    const { db, departures, packages, categories, destinations, organizers, users } = dbModule;
    await db.delete(departures).where(inArray(departures.id, DEP_IDS));
    await db.delete(packages).where(inArray(packages.id, pkgIds)); // hijos en cascade
    await db.delete(categories).where(inArray(categories.id, CAT_IDS));
    await db.delete(destinations).where(eq(destinations.id, DEST_ID));
    await db.delete(organizers).where(inArray(organizers.id, orgIds));
    await db.delete(users).where(inArray(users.id, userIds));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./own-package-service");
    await cleanup();
    const {
      db, users, organizers, destinations, categories, packages, packageCategories,
      packageImages, packageItineraryDays, packageInclusions, departures,
    } = dbModule;

    await db.insert(users).values(
      userIds.map((uid, i) => ({
        id: uid,
        clerkId: `test_own_package_${i}`,
        email: `test-own-package-${i}@example.invalid`,
        role: "organizer" as const,
      })),
    );
    await db.insert(organizers).values(
      orgIds.map((oid, i) => ({
        id: oid,
        userId: userIds[i],
        businessName: `Operador de prueba ${i}`,
        ruc: "20000000000",
        whatsapp: "+51900000000",
        status: "active" as const,
      })),
    );
    await db.insert(destinations).values({
      id: DEST_ID,
      slug: "test-own-package-destino",
      name: "Destino de prueba own-package",
      region: "Región de prueba",
    });
    await db.insert(categories).values([
      { id: CAT_IDS[0], slug: "test-own-package-a", name: "Cat A" },
      { id: CAT_IDS[1], slug: "test-own-package-b", name: "Cat B" },
    ]);

    const base = {
      destinationId: DEST_ID,
      blurb: "Resumen de prueba del paquete",
      durationDays: 2,
      nights: 1,
      priceCents: 25_000,
      maxGroupSize: 10,
      languages: ["es", "en"],
    };
    await db.insert(packages).values([
      {
        ...base,
        id: PKG_FULL,
        organizerId: mine,
        kind: "day_tour",
        slug: "test-own-package-full",
        title: "Paquete completo",
        description: "Descripción larga del paquete de prueba",
        durationDays: 1,
        nights: 0,
        durationHours: 6,
        startTime: "08:30",
        meetingPoint: "Plaza de Armas",
        meetingLat: -13.5164,
        meetingLng: -71.9785,
        coverImageUrl: "/seed/portada.jpg",
        status: "published",
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
      {
        ...base,
        id: PKG_DRAFT,
        organizerId: mine,
        kind: "package",
        slug: "test-own-package-draft",
        title: "Borrador sin extras",
        status: "draft",
        createdAt: new Date("2026-01-03T00:00:00Z"),
      },
      {
        ...base,
        id: PKG_OTHER,
        organizerId: other,
        kind: "package",
        slug: "test-own-package-other",
        title: "Paquete ajeno",
        status: "published",
        createdAt: new Date("2026-01-04T00:00:00Z"),
      },
    ]);
    await db.insert(packageCategories).values(
      CAT_IDS.map((categoryId) => ({ packageId: PKG_FULL, categoryId })),
    );
    // Insertadas desordenadas a propósito: la lectura ordena por sort_order / day_number.
    await db.insert(packageImages).values([
      { packageId: PKG_FULL, url: "/seed/dos.jpg", alt: null, credit: "Foto B", sortOrder: 2 },
      { packageId: PKG_FULL, url: "/seed/uno.jpg", alt: "Uno", credit: null, sortOrder: 1 },
    ]);
    await db.insert(packageItineraryDays).values([
      {
        packageId: PKG_FULL, dayNumber: 2, title: "Día dos", description: "Segundo día del tour",
        place: "Ollantaytambo", transportLeg: "Bus 2 h", imageUrl: "/seed/d2.jpg", lat: -13.25, lng: -72.26,
      },
      {
        packageId: PKG_FULL, dayNumber: 1, title: "Día uno", description: "Primer día del tour",
        place: "Cusco",
      },
    ]);
    await db.insert(packageInclusions).values([
      { packageId: PKG_FULL, kind: "included", text: "Segundo incluido", sortOrder: 2 },
      { packageId: PKG_FULL, kind: "excluded", text: "No incluye propinas", sortOrder: 1 },
      { packageId: PKG_FULL, kind: "included", text: "Primer incluido", sortOrder: 1 },
    ]);
    await db.insert(departures).values(
      DEP_IDS.map((depId, i) => ({
        id: depId,
        packageId: PKG_FULL,
        startsAt: new Date(`2099-0${i + 1}-01T12:00:00Z`),
        capacity: 5,
      })),
    );
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  it("AC19: listOwnPackages excluye los de otro operador, incluye draft y published, recientes primero", async () => {
    const list = await svc.listOwnPackages(scopeOf(mine));
    expect(list.map((p) => p.id)).toEqual([PKG_DRAFT, PKG_FULL]);
    expect(list.map((p) => p.status)).toEqual(["draft", "published"]);
    expect((await svc.listOwnPackages(scopeOf(other))).map((p) => p.id)).toEqual([PKG_OTHER]);
  });

  it("AC19: listOwnPackages trae departureCount, destinationName y coverImageUrl", async () => {
    const [draft, full] = await svc.listOwnPackages(scopeOf(mine));
    expect(full).toEqual({
      id: PKG_FULL,
      slug: "test-own-package-full",
      title: "Paquete completo",
      kind: "day_tour",
      status: "published",
      durationDays: 1,
      priceCents: 25_000,
      coverImageUrl: "/seed/portada.jpg",
      destinationName: "Destino de prueba own-package",
      departureCount: 2,
      organizerName: "Operador de prueba 0",
    });
    expect(draft).toMatchObject({ coverImageUrl: null, departureCount: 0 });
  });

  it("AC1: listOwnPackages('all') lista paquetes de varios operadores con organizerName", async () => {
    const list = (await svc.listOwnPackages("all")).filter((p) => pkgIds.includes(p.id));
    expect(list.map((p) => [p.id, p.organizerName])).toEqual([
      [PKG_OTHER, "Operador de prueba 1"],
      [PKG_DRAFT, "Operador de prueba 0"],
      [PKG_FULL, "Operador de prueba 0"],
    ]);
    expect(list.find((p) => p.id === PKG_FULL)?.departureCount).toBe(2);
  });

  it("AC2: getOwnPackageForEdit('all') devuelve un paquete ajeno; el scope de operador no", async () => {
    expect(await svc.getOwnPackageForEdit("all", PKG_OTHER)).toMatchObject({ id: PKG_OTHER });
    expect(await svc.getOwnPackageForEdit(scopeOf(mine), PKG_OTHER)).toBeNull();
    expect(await svc.getOwnPackageForEdit("all", id(0xff))).toBeNull();
    expect(await svc.getOwnPackageForEdit("all", "no-es-uuid")).toBeNull();
  });

  it("AC19: getOwnPackageForEdit ajeno, inexistente o con id mal formado -> null", async () => {
    expect(await svc.getOwnPackageForEdit(scopeOf(mine), PKG_OTHER)).toBeNull();
    expect(await svc.getOwnPackageForEdit(scopeOf(mine), id(0xff))).toBeNull();
    expect(await svc.getOwnPackageForEdit(scopeOf(mine), "no-es-uuid")).toBeNull();
  });

  it("AC19: getOwnPackageForEdit propio devuelve values completo y ordenado", async () => {
    const res = await svc.getOwnPackageForEdit(scopeOf(mine), PKG_FULL);
    expect(res).toEqual({
      id: PKG_FULL,
      slug: "test-own-package-full",
      departureCount: 2,
      values: {
        kind: "day_tour",
        title: "Paquete completo",
        blurb: "Resumen de prueba del paquete",
        description: "Descripción larga del paquete de prueba",
        destinationId: DEST_ID,
        categoryIds: [...CAT_IDS].sort(),
        priceCents: 25_000,
        durationDays: 1,
        nights: 0,
        durationHours: 6,
        startTime: "08:30",
        maxGroupSize: 10,
        languages: ["es", "en"],
        meetingPoint: "Plaza de Armas",
        meetingLat: -13.5164,
        meetingLng: -71.9785,
        coverImageUrl: "/seed/portada.jpg",
        images: [
          { url: "/seed/uno.jpg", alt: "Uno", credit: null },
          { url: "/seed/dos.jpg", alt: null, credit: "Foto B" },
        ],
        itinerary: [
          {
            title: "Día uno", description: "Primer día del tour", place: "Cusco",
            transportLeg: null, imageUrl: null, lat: null, lng: null,
          },
          {
            title: "Día dos", description: "Segundo día del tour", place: "Ollantaytambo",
            transportLeg: "Bus 2 h", imageUrl: "/seed/d2.jpg", lat: -13.25, lng: -72.26,
          },
        ],
        included: ["Primer incluido", "Segundo incluido"],
        excluded: ["No incluye propinas"],
        status: "published",
      },
    });
  });

  it("AC19: getOwnPackageForEdit de un borrador mínimo normaliza nulos", async () => {
    const res = await svc.getOwnPackageForEdit(scopeOf(mine), PKG_DRAFT);
    expect(res?.departureCount).toBe(0);
    expect(res?.values).toMatchObject({
      kind: "package",
      description: "",
      coverImageUrl: "",
      durationHours: null,
      startTime: null,
      meetingPoint: null,
      meetingLat: null,
      meetingLng: null,
      categoryIds: [],
      images: [],
      itinerary: [],
      included: [],
      excluded: [],
      status: "draft",
    });
  });

  it("AC19: getManageOptions devuelve destinos y categorías", async () => {
    const opts = await svc.getManageOptions();
    expect(opts.destinations).toContainEqual({
      id: DEST_ID,
      name: "Destino de prueba own-package",
      region: "Región de prueba",
    });
    expect(opts.categories.map((c) => c.id)).toEqual(expect.arrayContaining(CAT_IDS));
  });
});
