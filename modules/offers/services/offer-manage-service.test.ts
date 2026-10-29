import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { OrganizerScope } from "@/modules/packages";

import type { OfferInput, OfferUpdateInput } from "../schemas/offer-schema";

// lib/db y el barrel de packages lanzan sin DATABASE_URL: import dinámico dentro del bloque.
// BD compartida: ids/slugs únicos por corrida; solo se crean, tocan y borran filas propias.
describe.skipIf(!process.env.DATABASE_URL)("offer-manage-service (db)", () => {
  const P = `test-t5-${randomUUID()}`;
  const userIds = [randomUUID(), randomUUID(), randomUUID()]; // 0,1 operadores; 2 cliente
  const orgIds = [randomUUID(), randomUUID()];
  const destId = randomUUID();
  const pubPkg = randomUUID(); // mío, publicado, max 10
  const draftPkg = randomUUID(); // mío, borrador, max 8
  const otherPkg = randomUUID(); // ajeno, publicado
  const pkgIds = [pubPkg, draftPkg, otherPkg];
  const depId = randomUUID();
  const bookingId = randomUUID();
  const otherOffer = randomUUID();

  const now = new Date("2026-06-01T12:00:00Z");
  const past = new Date("2026-05-01T04:59:00Z");
  const future = new Date("2030-01-01T04:59:00Z");

  const mine: OrganizerScope = { id: orgIds[0], status: "active" };
  const pending: OrganizerScope = { id: orgIds[0], status: "pending" };
  const suspended: OrganizerScope = { id: orgIds[0], status: "suspended" };
  const other: OrganizerScope = { id: orgIds[1], status: "active" };

  const input = (over: Partial<OfferInput> = {}): OfferInput => ({
    packageId: pubPkg,
    kind: "groups",
    discountType: "percent",
    discountValue: 15,
    minPeople: null,
    validUntil: null,
    // Inactiva por defecto: BD compartida, una oferta activa sobre paquete publicado sería visible en el catálogo público.
    isActive: false,
    ...over,
  });
  const update = (over: Partial<OfferUpdateInput> = {}): OfferUpdateInput => {
    const rest: Partial<OfferInput> = input(over);
    delete rest.packageId;
    return rest as OfferUpdateInput;
  };

  let svc: typeof import("./offer-manage-service");
  let dbModule: typeof import("@/lib/db");

  const countOffers = async () => {
    const { db, offers } = dbModule;
    return (await db.select({ id: offers.id }).from(offers).where(inArray(offers.packageId, pkgIds))).length;
  };
  const getOffer = async (id: string) => {
    const { db, offers } = dbModule;
    return (await db.select().from(offers).where(eq(offers.id, id)))[0];
  };

  // Orden inverso de FKs; todo por ids/paquetes propios.
  const cleanup = async () => {
    const { db, bookings, departures, destinations, offers, organizers, packages, users } = dbModule;
    await db.delete(bookings).where(eq(bookings.id, bookingId));
    await db.delete(departures).where(eq(departures.id, depId));
    await db.delete(offers).where(inArray(offers.packageId, pkgIds));
    await db.delete(packages).where(inArray(packages.id, pkgIds));
    await db.delete(destinations).where(eq(destinations.id, destId));
    await db.delete(organizers).where(inArray(organizers.id, orgIds));
    await db.delete(users).where(inArray(users.id, userIds));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./offer-manage-service");
    const { db, destinations, organizers, packages, users, offers } = dbModule;
    try {
      await db.insert(users).values(
        userIds.map((id, i) => ({
          id,
          clerkId: `${P}-${i}`,
          email: `${P}-${i}@example.invalid`,
          role: i < 2 ? ("organizer" as const) : ("customer" as const),
        })),
      );
      await db.insert(organizers).values(
        orgIds.map((id, i) => ({
          id,
          userId: userIds[i],
          businessName: `${P} operador ${i}`,
          ruc: "20000000000",
          whatsapp: "+51900000000",
          status: "active" as const,
        })),
      );
      await db.insert(destinations).values({ id: destId, slug: P, name: `${P} destino`, region: "Región de prueba" });
      const base = {
        destinationId: destId,
        kind: "package" as const,
        blurb: "Prueba",
        durationDays: 2,
        nights: 1,
        priceCents: 10000,
        languages: ["es"],
      };
      await db.insert(packages).values([
        { ...base, id: pubPkg, organizerId: orgIds[0], slug: `${P}-pub`, title: `${P} pub`, maxGroupSize: 10, status: "published" },
        { ...base, id: draftPkg, organizerId: orgIds[0], slug: `${P}-draft`, title: `${P} draft`, maxGroupSize: 8, status: "draft" },
        { ...base, id: otherPkg, organizerId: orgIds[1], slug: `${P}-other`, title: `${P} other`, maxGroupSize: 5, status: "published" },
      ]);
      await db.insert(offers).values({
        id: otherOffer,
        packageId: otherPkg,
        kind: "groups",
        discountType: "percent",
        discountValue: 10,
        isActive: false,
      });
    } catch (e) {
      await cleanup();
      throw e;
    }
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  describe("createOffer", () => {
    it("AC10: inserta con los campos del input y AC13: catalogChanged según estado del paquete", async () => {
      const pub = await svc.createOffer(
        mine,
        input({ kind: "last_minute", discountValue: 20, minPeople: 4, validUntil: future }),
        now,
      );
      expect(pub).toMatchObject({ ok: true, catalogChanged: true });
      if (!pub.ok) return;
      expect(await getOffer(pub.id)).toMatchObject({
        packageId: pubPkg,
        kind: "last_minute",
        discountType: "percent",
        discountValue: 20,
        minPeople: 4,
        validUntil: future,
        isActive: false,
      });

      const draft = await svc.createOffer(
        mine,
        input({ packageId: draftPkg, discountType: "two_for_one", discountValue: null, isActive: true }),
        now,
      );
      expect(draft).toMatchObject({ ok: true, catalogChanged: false });
      if (draft.ok) expect((await getOffer(draft.id)).isActive).toBe(true);
    });

    it("AC10: paquete ajeno -> INVALID_INPUT con fieldErrors.packageId y sin insertar", async () => {
      const before = await countOffers();
      const res = await svc.createOffer(mine, input({ packageId: otherPkg }), now);
      expect(res).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { packageId: "Elige un paquete tuyo." },
      });
      expect(await countOffers()).toBe(before);
    });

    it("AC10: suspended -> ORGANIZER_SUSPENDED sin escribir; pending puede crear", async () => {
      const before = await countOffers();
      expect(await svc.createOffer(suspended, input(), now)).toMatchObject({
        ok: false,
        code: "ORGANIZER_SUSPENDED",
      });
      expect(await countOffers()).toBe(before);

      expect(await svc.createOffer(pending, input(), now)).toMatchObject({ ok: true });
      expect(await countOffers()).toBe(before + 1);
    });

    it("AC10: permite una segunda oferta activa del mismo paquete", async () => {
      const a = await svc.createOffer(mine, input({ packageId: draftPkg, isActive: true }), now);
      const b = await svc.createOffer(mine, input({ packageId: draftPkg, kind: "rainy_season", isActive: true }), now);
      expect(a.ok).toBe(true);
      expect(b.ok).toBe(true);
    });

    it("AC10: vigencia pasada o igual a now -> INVALID_INPUT en validUntil", async () => {
      for (const validUntil of [past, now]) {
        expect(await svc.createOffer(mine, input({ validUntil }), now)).toMatchObject({
          ok: false,
          code: "INVALID_INPUT",
          fieldErrors: { validUntil: expect.any(String) },
        });
      }
    });

    it("AC10: min_people > max_group_size -> INVALID_INPUT en minPeople", async () => {
      expect(await svc.createOffer(mine, input({ minPeople: 11 }), now)).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { minPeople: expect.any(String) },
      });
      expect(await svc.createOffer(mine, input({ minPeople: 10 }), now)).toMatchObject({ ok: true });
    });

    it("AC10: scope 'all' crea sobre paquete de cualquier operador", async () => {
      expect(await svc.createOffer("all", input({ packageId: otherPkg }), now)).toMatchObject({
        ok: true,
        catalogChanged: true,
      });
    });
  });

  describe("updateOffer", () => {
    const seed = async (over: Partial<OfferInput> = {}) => {
      const res = await svc.createOffer(mine, input({ validUntil: future, ...over }), now);
      if (!res.ok) throw new Error("seed falló");
      return res.id;
    };

    it("AC11: actualiza campos editables sin tocar package_id ni created_at; AC13: catalogChanged", async () => {
      const id = await seed();
      const before = await getOffer(id);
      const res = await svc.updateOffer(
        mine,
        id,
        update({ kind: "rainy_season", discountType: "two_for_one", discountValue: null, minPeople: 3, isActive: false }),
        now,
      );
      expect(res).toEqual({ ok: true, catalogChanged: true });
      expect(await getOffer(id)).toMatchObject({
        packageId: pubPkg,
        createdAt: before.createdAt,
        kind: "rainy_season",
        discountType: "two_for_one",
        discountValue: null,
        minPeople: 3,
        validUntil: null,
        isActive: false,
      });

      const draftId = await seed({ packageId: draftPkg });
      expect(await svc.updateOffer(mine, draftId, update({ isActive: true }), now)).toEqual({
        ok: true,
        catalogChanged: false,
      });
      expect((await getOffer(draftId)).isActive).toBe(true);
    });

    it("AC11: oferta ajena o inexistente -> NOT_FOUND y no se modifica", async () => {
      expect(await svc.updateOffer(mine, otherOffer, update({ discountValue: 99 }), now)).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
      expect((await getOffer(otherOffer)).discountValue).toBe(10);
      expect(await svc.updateOffer(mine, randomUUID(), update(), now)).toMatchObject({ code: "NOT_FOUND" });
      const own = await seed();
      expect(await svc.updateOffer(other, own, update({ validUntil: future }), now)).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
    });

    it("AC11: editar una oferta vencida sin cambiar la fecha es válido", async () => {
      const { db, offers } = dbModule;
      const id = await seed();
      await db.update(offers).set({ validUntil: past }).where(eq(offers.id, id));
      expect(await svc.updateOffer(mine, id, update({ validUntil: past, discountValue: 30 }), now)).toMatchObject({
        ok: true,
      });
      expect((await getOffer(id)).discountValue).toBe(30);
    });

    it("AC11: renovar con una fecha pasada -> INVALID_INPUT; con fecha futura OK", async () => {
      const { db, offers } = dbModule;
      const id = await seed();
      await db.update(offers).set({ validUntil: past }).where(eq(offers.id, id));
      expect(await svc.updateOffer(mine, id, update({ validUntil: new Date("2026-05-15T04:59:00Z") }), now)).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { validUntil: expect.any(String) },
      });
      expect(await svc.updateOffer(mine, id, update({ validUntil: future }), now)).toMatchObject({ ok: true });
    });

    it("AC11: min_people > max_group_size -> INVALID_INPUT", async () => {
      const id = await seed();
      expect(await svc.updateOffer(mine, id, update({ validUntil: future, minPeople: 11 }), now)).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { minPeople: expect.any(String) },
      });
    });

    it("AC11: suspended no escribe; pending puede editar", async () => {
      const id = await seed();
      expect(await svc.updateOffer(suspended, id, update({ validUntil: future, discountValue: 50 }), now)).toMatchObject({
        ok: false,
        code: "ORGANIZER_SUSPENDED",
      });
      expect((await getOffer(id)).discountValue).toBe(15);
      expect(await svc.updateOffer(pending, id, update({ validUntil: future, discountValue: 50 }), now)).toMatchObject({
        ok: true,
      });
    });

    it("AC11: scope 'all' edita ofertas de cualquier operador", async () => {
      expect(await svc.updateOffer("all", otherOffer, update({ discountValue: 12 }), now)).toMatchObject({
        ok: true,
        catalogChanged: true,
      });
      expect((await getOffer(otherOffer)).discountValue).toBe(12);
    });
  });

  describe("deleteOffer", () => {
    const seed = async (packageId = pubPkg) => {
      const res = await svc.createOffer(mine, input({ packageId }), now);
      if (!res.ok) throw new Error("seed falló");
      return res.id;
    };

    it("AC12: borra la fila propia y AC13: catalogChanged según estado del paquete", async () => {
      const id = await seed();
      expect(await svc.deleteOffer(mine, id)).toEqual({ ok: true, catalogChanged: true });
      expect(await getOffer(id)).toBeUndefined();

      const draftId = await seed(draftPkg);
      expect(await svc.deleteOffer(mine, draftId)).toEqual({ ok: true, catalogChanged: false });
    });

    it("AC12: oferta ajena o inexistente -> NOT_FOUND y no se borra", async () => {
      expect(await svc.deleteOffer(mine, otherOffer)).toMatchObject({ ok: false, code: "NOT_FOUND" });
      expect(await getOffer(otherOffer)).toBeDefined();
      expect(await svc.deleteOffer(mine, randomUUID())).toMatchObject({ code: "NOT_FOUND" });
    });

    it("AC12: suspended no borra", async () => {
      const id = await seed();
      expect(await svc.deleteOffer(suspended, id)).toMatchObject({ ok: false, code: "ORGANIZER_SUSPENDED" });
      expect(await getOffer(id)).toBeDefined();
    });

    it("AC12: la reserva que referenciaba la oferta sigue, con offer_id null e importes intactos", async () => {
      const { db, bookings, departures } = dbModule;
      const id = await seed();
      await db.insert(departures).values({
        id: depId,
        packageId: pubPkg,
        startsAt: new Date("2030-06-01T14:00:00Z"),
        capacity: 10,
      });
      await db.insert(bookings).values({
        id: bookingId,
        customerId: userIds[2],
        packageId: pubPkg,
        departureId: depId,
        offerId: id,
        paxCount: 2,
        unitPriceCents: 10000,
        discountCents: 3000,
        totalCents: 17000,
        exchangeRate: 3.75,
        contactEmail: `${P}@example.invalid`,
        contactPhone: "+51900000000",
        termsAcceptedAt: now,
      });

      expect(await svc.deleteOffer(mine, id)).toMatchObject({ ok: true });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      expect(booking).toMatchObject({ offerId: null, discountCents: 3000, totalCents: 17000 });
    });

    it("AC12: scope 'all' borra ofertas de cualquier operador", async () => {
      const res = await svc.createOffer("all", input({ packageId: otherPkg }), now);
      if (!res.ok) throw new Error("seed falló");
      expect(await svc.deleteOffer("all", res.id)).toEqual({ ok: true, catalogChanged: true });
      expect(await getOffer(res.id)).toBeUndefined();
    });
  });
});
