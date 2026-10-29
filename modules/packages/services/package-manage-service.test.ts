import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PackageInput } from "../schemas/package-schema";
import type { OrganizerScope } from "../types/package-manage";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("package-manage-service (db)", () => {
  const userIds = [
    "00000000-0000-4000-8000-000000211001",
    "00000000-0000-4000-8000-000000211002",
    "00000000-0000-4000-8000-000000211003",
  ];
  const orgIds = ["00000000-0000-4000-8000-000000211011", "00000000-0000-4000-8000-000000211012"];
  const CUSTOMER_ID = userIds[2];
  const SLUG_PREFIX = "zz-prueba-021";
  const mine: OrganizerScope = { id: orgIds[0], status: "active" };
  const other: OrganizerScope = { id: orgIds[1], status: "active" };
  const pending: OrganizerScope = { ...mine, status: "pending" };
  const suspended: OrganizerScope = { ...mine, status: "suspended" };
  const MISSING_ID = "00000000-0000-4000-8000-0000002110ff";

  let svc: typeof import("./package-manage-service");
  let dbModule: typeof import("@/lib/db");
  let seedId: typeof import("@/lib/db/seed/helpers").seedId;

  const makeInput = (title: string, over: Partial<PackageInput> = {}): PackageInput => ({
    kind: "package",
    title,
    blurb: "Un viaje de prueba para tests",
    description: "Descripción de prueba suficientemente larga para el paquete.",
    destinationId: seedId("destination:lima"),
    categoryIds: [seedId("category:cultura"), seedId("category:aventura")],
    priceCents: 129000,
    durationDays: 3,
    nights: 2,
    durationHours: null,
    startTime: null,
    maxGroupSize: 10,
    languages: ["es"],
    meetingPoint: "Plaza de Armas",
    meetingLat: -12.04,
    meetingLng: -77.03,
    coverImageUrl: "/seed/test-cover.jpg",
    images: [
      { url: "/seed/test-a.jpg", alt: "A", credit: null },
      { url: "/seed/test-b.jpg", alt: null, credit: "Foto B" },
    ],
    itinerary: [
      {
        title: "Día uno",
        description: "Llegada y traslado al hotel.",
        place: "Lima",
        transportLeg: null,
        imageUrl: null,
        lat: null,
        lng: null,
      },
      {
        title: "Día dos",
        description: "Visita guiada por el centro.",
        place: "Lima",
        transportLeg: "Bus",
        imageUrl: "/seed/test-d2.jpg",
        lat: -12.05,
        lng: -77.04,
      },
    ],
    included: ["Guía", "Entradas"],
    excluded: ["Propinas"],
    status: "draft",
    ...over,
  });

  const cleanup = async () => {
    const { db, bookings, departures, offers, packages, organizers, users } = dbModule;
    const ownPackages = db
      .select({ id: packages.id })
      .from(packages)
      .where(inArray(packages.organizerId, orgIds));
    await db.delete(bookings).where(eq(bookings.customerId, CUSTOMER_ID));
    await db.delete(departures).where(inArray(departures.packageId, ownPackages));
    await db.delete(offers).where(inArray(offers.packageId, ownPackages));
    await db.delete(packages).where(inArray(packages.organizerId, orgIds));
    await db.delete(organizers).where(inArray(organizers.id, orgIds));
    await db.delete(users).where(inArray(users.id, userIds));
  };

  const create = async (title: string, scope = mine, over: Partial<PackageInput> = {}) => {
    const r = await svc.createPackage(scope, makeInput(title, over));
    if (!r.ok) throw new Error(`setup: createPackage falló (${r.code})`);
    return r;
  };

  const snapshot = async (id: string) => {
    const { db, packages, packageCategories, packageImages, packageItineraryDays, packageInclusions } =
      dbModule;
    const [row] = await db.select().from(packages).where(eq(packages.id, id));
    if (!row) return null;
    return {
      row,
      categories: await db.select().from(packageCategories).where(eq(packageCategories.packageId, id)),
      images: await db.select().from(packageImages).where(eq(packageImages.packageId, id)),
      itinerary: await db
        .select()
        .from(packageItineraryDays)
        .where(eq(packageItineraryDays.packageId, id)),
      inclusions: await db
        .select()
        .from(packageInclusions)
        .where(eq(packageInclusions.packageId, id)),
    };
  };

  const addDeparture = async (packageId: string) => {
    const { db, departures } = dbModule;
    const [dep] = await db
      .insert(departures)
      .values({ packageId, startsAt: new Date("2099-01-01T12:00:00Z"), capacity: 10 })
      .returning({ id: departures.id });
    return dep.id;
  };

  const addBooking = async (packageId: string, departureId: string) => {
    const { db, bookings } = dbModule;
    await db.insert(bookings).values({
      customerId: CUSTOMER_ID,
      packageId,
      departureId,
      paxCount: 1,
      unitPriceCents: 1000,
      discountCents: 0,
      totalCents: 1000,
      exchangeRate: 3.75,
      contactEmail: "test-package-manage@example.invalid",
      contactPhone: "+51900000000",
      termsAcceptedAt: new Date(),
    });
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./package-manage-service");
    seedId = (await import("@/lib/db/seed/helpers")).seedId;
    await cleanup();
    const { db, organizers, users } = dbModule;
    await db.insert(users).values(
      userIds.map((id, i) => ({
        id,
        clerkId: `test_package_manage_${i}`,
        email: `test-package-manage-${i}@example.invalid`,
        role: i < 2 ? ("organizer" as const) : ("customer" as const),
      })),
    );
    await db.insert(organizers).values(
      orgIds.map((id, i) => ({
        id,
        userId: userIds[i],
        businessName: `Operador de prueba paquetes ${i}`,
        ruc: "20000000000",
        whatsapp: "+51900000000",
        status: "active" as const,
      })),
    );
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  describe("createPackage", () => {
    it("AC13: inserta paquete e hijas, asigna slug y devuelve catalogChanged según status", async () => {
      const r = await svc.createPackage(
        mine,
        makeInput("Zz Prueba 021 Crear", { status: "published" }),
      );
      expect(r).toMatchObject({ ok: true, slug: `${SLUG_PREFIX}-crear`, catalogChanged: true });
      if (!r.ok) return;

      const snap = await snapshot(r.id);
      expect(snap?.row).toMatchObject({
        organizerId: mine.id,
        currency: "PEN",
        status: "published",
        slug: `${SLUG_PREFIX}-crear`,
        title: "Zz Prueba 021 Crear",
        priceCents: 129000,
        coverImageUrl: "/seed/test-cover.jpg",
      });
      expect(snap?.categories.map((c) => c.categoryId).sort()).toEqual(
        [seedId("category:cultura"), seedId("category:aventura")].sort(),
      );
      expect(snap?.images.map((i) => [i.url, i.sortOrder]).sort()).toEqual([
        ["/seed/test-a.jpg", 0],
        ["/seed/test-b.jpg", 1],
      ]);
      expect(snap?.itinerary.map((d) => [d.dayNumber, d.title]).sort()).toEqual([
        [1, "Día uno"],
        [2, "Día dos"],
      ]);
      expect(snap?.inclusions.map((i) => [i.kind, i.text, i.sortOrder]).sort()).toEqual([
        ["excluded", "Propinas", 0],
        ["included", "Entradas", 1],
        ["included", "Guía", 0],
      ]);
    });

    it("AC13: un borrador devuelve catalogChanged false", async () => {
      const r = await svc.createPackage(mine, makeInput("Zz Prueba 021 Borrador"));
      expect(r).toMatchObject({ ok: true, catalogChanged: false });
    });

    it("AC14: título repetido (incluso de otro operador) -> sufijo -2 y -3", async () => {
      const a = await create("Zz Prueba 021 Repetido");
      const b = await create("Zz Prueba 021 Repetido", other);
      const c = await create("Zz Prueba 021 Repetido");
      expect([a.slug, b.slug, c.slug]).toEqual([
        `${SLUG_PREFIX}-repetido`,
        `${SLUG_PREFIX}-repetido-2`,
        `${SLUG_PREFIX}-repetido-3`,
      ]);
    });

    it("AC13: categoryIds inexistente -> INVALID_INPUT con fieldErrors.categoryIds y no queda nada", async () => {
      const { db, packages } = dbModule;
      const r = await svc.createPackage(
        mine,
        makeInput("Zz Prueba 021 Rollback", {
          categoryIds: [seedId("category:cultura"), MISSING_ID],
        }),
      );
      expect(r).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { categoryIds: expect.any(String) },
      });
      const left = await db
        .select({ id: packages.id })
        .from(packages)
        .where(like(packages.slug, `${SLUG_PREFIX}-rollback%`));
      expect(left).toEqual([]);
    });

    it("AC13: destinationId inexistente -> INVALID_INPUT con fieldErrors.destinationId y no queda nada", async () => {
      const { db, packages } = dbModule;
      const r = await svc.createPackage(
        mine,
        makeInput("Zz Prueba 021 Rollback Destino", { destinationId: MISSING_ID }),
      );
      expect(r).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { destinationId: expect.any(String) },
      });
      const left = await db
        .select({ id: packages.id })
        .from(packages)
        .where(like(packages.slug, `${SLUG_PREFIX}-rollback-destino%`));
      expect(left).toEqual([]);
    });

    it("AC16: pending no puede publicar (no escribe) pero sí guardar borrador", async () => {
      const { db, packages } = dbModule;
      const blocked = await svc.createPackage(
        pending,
        makeInput("Zz Prueba 021 Pending Pub", { status: "published" }),
      );
      expect(blocked).toMatchObject({ ok: false, code: "ORGANIZER_PENDING" });
      expect(
        await db
          .select({ id: packages.id })
          .from(packages)
          .where(like(packages.slug, `${SLUG_PREFIX}-pending-pub%`)),
      ).toEqual([]);

      const ok = await svc.createPackage(pending, makeInput("Zz Prueba 021 Pending Draft"));
      expect(ok).toMatchObject({ ok: true, catalogChanged: false });
    });

    it("AC16: suspended no crea nada", async () => {
      const { db, packages } = dbModule;
      const r = await svc.createPackage(suspended, makeInput("Zz Prueba 021 Suspendido"));
      expect(r).toMatchObject({ ok: false, code: "ORGANIZER_SUSPENDED" });
      expect(
        await db
          .select({ id: packages.id })
          .from(packages)
          .where(like(packages.slug, `${SLUG_PREFIX}-suspendido%`)),
      ).toEqual([]);
    });
  });

  describe("updatePackage", () => {
    it("AC15: reemplaza hijas, conserva slug y organizer y actualiza la fila", async () => {
      const created = await create("Zz Prueba 021 Editar");
      const r = await svc.updatePackage(
        mine,
        created.id,
        makeInput("Zz Prueba 021 Editar Nuevo Titulo", {
          priceCents: 250000,
          categoryIds: [seedId("category:naturaleza")],
          images: [{ url: "/seed/test-c.jpg", alt: "C", credit: null }],
          itinerary: [
            {
              title: "Único día",
              description: "Solo un día de programa.",
              place: "Lima",
              transportLeg: null,
              imageUrl: null,
              lat: null,
              lng: null,
            },
          ],
          included: ["Almuerzo"],
          excluded: [],
          durationDays: 1,
          nights: 0,
        }),
      );
      expect(r).toEqual({ ok: true, id: created.id, catalogChanged: false });

      const snap = await snapshot(created.id);
      expect(snap?.row).toMatchObject({
        slug: created.slug,
        organizerId: mine.id,
        title: "Zz Prueba 021 Editar Nuevo Titulo",
        priceCents: 250000,
        durationDays: 1,
        nights: 0,
      });
      expect(snap?.categories.map((c) => c.categoryId)).toEqual([seedId("category:naturaleza")]);
      expect(snap?.images.map((i) => i.url)).toEqual(["/seed/test-c.jpg"]);
      expect(snap?.itinerary.map((d) => [d.dayNumber, d.title])).toEqual([[1, "Único día"]]);
      expect(snap?.inclusions.map((i) => [i.kind, i.text])).toEqual([["included", "Almuerzo"]]);
    });

    it("AC15: catalogChanged = estado anterior published o nuevo published", async () => {
      const a = await create("Zz Prueba 021 Cat Draft");
      const p = await create("Zz Prueba 021 Cat Pub", mine, { status: "published" });

      const draftToDraft = await svc.updatePackage(mine, a.id, makeInput("Zz Prueba 021 Cat Draft"));
      const draftToPub = await svc.updatePackage(
        mine,
        a.id,
        makeInput("Zz Prueba 021 Cat Draft", { status: "published" }),
      );
      const pubToPub = await svc.updatePackage(
        mine,
        p.id,
        makeInput("Zz Prueba 021 Cat Pub", { status: "published" }),
      );
      const pubToDraft = await svc.updatePackage(mine, p.id, makeInput("Zz Prueba 021 Cat Pub"));

      expect(draftToDraft).toMatchObject({ ok: true, catalogChanged: false });
      expect(draftToPub).toMatchObject({ ok: true, catalogChanged: true });
      expect(pubToPub).toMatchObject({ ok: true, catalogChanged: true });
      expect(pubToDraft).toMatchObject({ ok: true, catalogChanged: true });
    });

    it("AC15: paquete ajeno o inexistente -> NOT_FOUND y no cambia nada", async () => {
      const theirs = await create("Zz Prueba 021 Ajeno", other);
      const before = await snapshot(theirs.id);

      const foreign = await svc.updatePackage(mine, theirs.id, makeInput("Zz Prueba 021 Hackeado"));
      const missing = await svc.updatePackage(mine, MISSING_ID, makeInput("Zz Prueba 021 Nada"));

      expect(foreign).toMatchObject({ ok: false, code: "NOT_FOUND" });
      expect(missing).toMatchObject({ ok: false, code: "NOT_FOUND" });
      expect(await snapshot(theirs.id)).toEqual(before);
    });

    it("AC15: destino o categoría inexistente -> INVALID_INPUT por campo y el paquete queda intacto", async () => {
      const created = await create("Zz Prueba 021 Upd Fk");
      const before = await snapshot(created.id);

      const badDestination = await svc.updatePackage(
        mine,
        created.id,
        makeInput("Zz Prueba 021 Upd Fk", { destinationId: MISSING_ID }),
      );
      const badCategory = await svc.updatePackage(
        mine,
        created.id,
        makeInput("Zz Prueba 021 Upd Fk", { categoryIds: [MISSING_ID] }),
      );

      expect(badDestination).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { destinationId: expect.any(String) },
      });
      expect(badCategory).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { categoryIds: expect.any(String) },
      });
      expect(await snapshot(created.id)).toEqual(before);
    });

    it("AC15: un paquete ajeno con destino inexistente sigue siendo NOT_FOUND", async () => {
      const theirs = await create("Zz Prueba 021 Ajeno Fk", other);
      const r = await svc.updatePackage(
        mine,
        theirs.id,
        makeInput("Zz Prueba 021 Ajeno Fk", { destinationId: MISSING_ID }),
      );
      expect(r).toMatchObject({ ok: false, code: "NOT_FOUND" });
    });

    it("AC16: pending puede pasar a borrador uno published, pero no publicar", async () => {
      const p = await create("Zz Prueba 021 Pend Upd", mine, { status: "published" });

      const publish = await svc.updatePackage(
        pending,
        p.id,
        makeInput("Zz Prueba 021 Pend Cambiado", { status: "published" }),
      );
      expect(publish).toMatchObject({ ok: false, code: "ORGANIZER_PENDING" });
      expect((await snapshot(p.id))?.row).toMatchObject({
        status: "published",
        title: "Zz Prueba 021 Pend Upd",
      });

      const draft = await svc.updatePackage(pending, p.id, makeInput("Zz Prueba 021 Pend Upd"));
      expect(draft).toMatchObject({ ok: true, catalogChanged: true });
      expect((await snapshot(p.id))?.row.status).toBe("draft");
    });

    it("AC16: suspended no modifica nada", async () => {
      const p = await create("Zz Prueba 021 Susp Upd");
      const before = await snapshot(p.id);
      const r = await svc.updatePackage(suspended, p.id, makeInput("Zz Prueba 021 Susp Cambiado"));
      expect(r).toMatchObject({ ok: false, code: "ORGANIZER_SUSPENDED" });
      expect(await snapshot(p.id)).toEqual(before);
    });
  });

  describe("setPackageStatus", () => {
    it("AC17: cambia el estado y es idempotente (catalogChanged false si no cambia)", async () => {
      const p = await create("Zz Prueba 021 Estado");

      expect(await svc.setPackageStatus(mine, p.id, "draft")).toEqual({
        ok: true,
        catalogChanged: false,
      });
      expect(await svc.setPackageStatus(mine, p.id, "published")).toEqual({
        ok: true,
        catalogChanged: true,
      });
      expect((await snapshot(p.id))?.row.status).toBe("published");
      expect(await svc.setPackageStatus(mine, p.id, "published")).toEqual({
        ok: true,
        catalogChanged: false,
      });
      expect(await svc.setPackageStatus(mine, p.id, "draft")).toEqual({
        ok: true,
        catalogChanged: true,
      });
      expect((await snapshot(p.id))?.row.status).toBe("draft");
    });

    it("AC17: ajeno o inexistente -> NOT_FOUND y no cambia", async () => {
      const theirs = await create("Zz Prueba 021 Estado Ajeno", other);
      expect(await svc.setPackageStatus(mine, theirs.id, "published")).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
      expect((await snapshot(theirs.id))?.row.status).toBe("draft");
      expect(await svc.setPackageStatus(mine, MISSING_ID, "published")).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
    });

    it("AC17: pending no publica pero sí despublica; suspended no puede nada", async () => {
      const draft = await create("Zz Prueba 021 Estado Pend");
      const pub = await create("Zz Prueba 021 Estado Pend Pub", mine, { status: "published" });

      expect(await svc.setPackageStatus(pending, draft.id, "published")).toMatchObject({
        ok: false,
        code: "ORGANIZER_PENDING",
      });
      expect((await snapshot(draft.id))?.row.status).toBe("draft");

      expect(await svc.setPackageStatus(pending, pub.id, "draft")).toEqual({
        ok: true,
        catalogChanged: true,
      });
      expect((await snapshot(pub.id))?.row.status).toBe("draft");

      expect(await svc.setPackageStatus(suspended, draft.id, "draft")).toMatchObject({
        ok: false,
        code: "ORGANIZER_SUSPENDED",
      });
      expect(await svc.setPackageStatus(suspended, draft.id, "published")).toMatchObject({
        ok: false,
        code: "ORGANIZER_SUSPENDED",
      });
    });
  });

  describe("deletePackage", () => {
    it("AC18: con reserva -> HAS_BOOKINGS (prioridad sobre salidas) y no borra", async () => {
      const p = await create("Zz Prueba 021 Del Reserva");
      const depId = await addDeparture(p.id);
      await addBooking(p.id, depId);

      expect(await svc.deletePackage(mine, p.id)).toMatchObject({
        ok: false,
        code: "HAS_BOOKINGS",
      });
      expect(await snapshot(p.id)).not.toBeNull();
    });

    it("AC18: con salida y sin reservas -> HAS_DEPARTURES y no borra", async () => {
      const p = await create("Zz Prueba 021 Del Salida");
      await addDeparture(p.id);

      expect(await svc.deletePackage(mine, p.id)).toMatchObject({
        ok: false,
        code: "HAS_DEPARTURES",
      });
      expect(await snapshot(p.id)).not.toBeNull();
    });

    it("AC18: con oferta y sin reservas ni salidas -> HAS_OFFERS y no borra", async () => {
      const { db, offers } = dbModule;
      const p = await create("Zz Prueba 021 Del Oferta");
      await db
        .insert(offers)
        .values({ packageId: p.id, kind: "groups", discountType: "percent", discountValue: 10 });

      expect(await svc.deletePackage(mine, p.id)).toMatchObject({
        ok: false,
        code: "HAS_OFFERS",
      });
      expect(await snapshot(p.id)).not.toBeNull();
    });

    it("AC18: sin dependencias borra el paquete y por cascade sus hijas", async () => {
      const { db, packageCategories, packageImages, packageItineraryDays, packageInclusions } =
        dbModule;
      const p = await create("Zz Prueba 021 Del Limpio", mine, { status: "published" });

      expect(await svc.deletePackage(mine, p.id)).toEqual({ ok: true, catalogChanged: true });
      expect(await snapshot(p.id)).toBeNull();
      for (const table of [
        packageCategories,
        packageImages,
        packageItineraryDays,
        packageInclusions,
      ]) {
        expect(await db.select().from(table).where(eq(table.packageId, p.id))).toEqual([]);
      }
    });

    it("AC18: borrar un borrador devuelve catalogChanged false", async () => {
      const p = await create("Zz Prueba 021 Del Borrador");
      expect(await svc.deletePackage(mine, p.id)).toEqual({ ok: true, catalogChanged: false });
    });

    it("AC18: pending puede borrar", async () => {
      const p = await create("Zz Prueba 021 Del Pending");
      expect(await svc.deletePackage(pending, p.id)).toEqual({ ok: true, catalogChanged: false });
      expect(await snapshot(p.id)).toBeNull();
    });

    it("AC18: ajeno o inexistente -> NOT_FOUND y no borra", async () => {
      const theirs = await create("Zz Prueba 021 Del Ajeno", other);
      expect(await svc.deletePackage(mine, theirs.id)).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
      expect(await snapshot(theirs.id)).not.toBeNull();
      expect(await svc.deletePackage(mine, MISSING_ID)).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
    });

    it("AC18: suspended -> ORGANIZER_SUSPENDED y no borra", async () => {
      const p = await create("Zz Prueba 021 Del Suspendido");
      expect(await svc.deletePackage(suspended, p.id)).toMatchObject({
        ok: false,
        code: "ORGANIZER_SUSPENDED",
      });
      expect(await snapshot(p.id)).not.toBeNull();
    });
  });

  describe('scope "all" (admin, 027)', () => {
    it("AC4: updatePackage actualiza un paquete de otro operador sin cambiar dueño ni slug", async () => {
      const theirs = await create("Zz Prueba 021 All Upd", other);
      const r = await svc.updatePackage(
        "all",
        theirs.id,
        makeInput("Zz Prueba 021 All Upd Nuevo", { status: "published" }),
      );
      expect(r).toEqual({ ok: true, id: theirs.id, catalogChanged: true });
      expect((await snapshot(theirs.id))?.row).toMatchObject({
        organizerId: other.id,
        slug: theirs.slug,
        title: "Zz Prueba 021 All Upd Nuevo",
        status: "published",
      });
    });

    it("AC4: updatePackage con id inexistente -> NOT_FOUND", async () => {
      expect(await svc.updatePackage("all", MISSING_ID, makeInput("Zz Prueba 021 All Nada"))).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
    });

    it("AC3: setPackageStatus publica y despublica uno ajeno (sin getWriteBlock)", async () => {
      const theirs = await create("Zz Prueba 021 All Estado", other);
      expect(await svc.setPackageStatus("all", theirs.id, "published")).toEqual({
        ok: true,
        catalogChanged: true,
      });
      expect((await snapshot(theirs.id))?.row.status).toBe("published");
      expect(await svc.setPackageStatus("all", theirs.id, "draft")).toEqual({
        ok: true,
        catalogChanged: true,
      });
      expect(await svc.setPackageStatus("all", MISSING_ID, "draft")).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
    });

    it("AC3: el estado del operador no bloquea a admin; el mismo paquete sí bloquea a OrganizerScope suspended", async () => {
      const p = await create("Zz Prueba 021 All Susp");
      expect(await svc.setPackageStatus(suspended, p.id, "published")).toMatchObject({
        ok: false,
        code: "ORGANIZER_SUSPENDED",
      });
      expect(await svc.setPackageStatus("all", p.id, "published")).toMatchObject({ ok: true });
      expect(await svc.deletePackage(suspended, p.id)).toMatchObject({
        ok: false,
        code: "ORGANIZER_SUSPENDED",
      });
      expect(await svc.deletePackage("all", p.id)).toEqual({ ok: true, catalogChanged: true });
      expect(await snapshot(p.id)).toBeNull();
    }, 30_000);

    it("AC3: deletePackage borra uno ajeno y respeta HAS_BOOKINGS / HAS_DEPARTURES / HAS_OFFERS", async () => {
      const { db, offers } = dbModule;
      const free = await create("Zz Prueba 021 All Del", other);
      expect(await svc.deletePackage("all", free.id)).toEqual({ ok: true, catalogChanged: false });
      expect(await snapshot(free.id)).toBeNull();

      const withBooking = await create("Zz Prueba 021 All Del Reserva", other);
      await addBooking(withBooking.id, await addDeparture(withBooking.id));
      expect(await svc.deletePackage("all", withBooking.id)).toMatchObject({
        ok: false,
        code: "HAS_BOOKINGS",
      });

      const withDeparture = await create("Zz Prueba 021 All Del Salida", other);
      await addDeparture(withDeparture.id);
      expect(await svc.deletePackage("all", withDeparture.id)).toMatchObject({
        ok: false,
        code: "HAS_DEPARTURES",
      });

      const withOffer = await create("Zz Prueba 021 All Del Oferta", other);
      await db
        .insert(offers)
        .values({ packageId: withOffer.id, kind: "groups", discountType: "percent", discountValue: 10 });
      expect(await svc.deletePackage("all", withOffer.id)).toMatchObject({
        ok: false,
        code: "HAS_OFFERS",
      });
      expect(await svc.deletePackage("all", MISSING_ID)).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
    }, 30_000);

    it("AC4: OrganizerScope sigue dando NOT_FOUND en paquetes ajenos (sin regresión)", async () => {
      const theirs = await create("Zz Prueba 021 All Regresion", other);
      expect(await svc.updatePackage(mine, theirs.id, makeInput("Zz Prueba 021 X"))).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
      expect(await svc.setPackageStatus(mine, theirs.id, "published")).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
      expect(await svc.deletePackage(mine, theirs.id)).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
      expect(await snapshot(theirs.id)).not.toBeNull();
    });
  });
});
