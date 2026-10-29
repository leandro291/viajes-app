import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { OrganizerScope } from "@/modules/packages";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
// BD compartida: ids/slugs únicos por corrida y se borran solo las filas creadas aquí.
describe.skipIf(!process.env.DATABASE_URL)("offer-list-service (db)", () => {
  const P = `test-t4-${randomUUID()}`;
  const userIds = [randomUUID(), randomUUID()];
  const orgIds = [randomUUID(), randomUUID()];
  const destId = randomUUID();
  // mío: "B" publicado, "A" borrador; ajeno: "C"
  const pkgA = randomUUID();
  const pkgB = randomUUID();
  const pkgC = randomUUID();
  const pkgIds: string[] = [pkgA, pkgB, pkgC];
  const off = { a1: randomUUID(), b1: randomUUID(), b2: randomUUID(), c1: randomUUID() };
  const offIds: string[] = Object.values(off);
  const mine: OrganizerScope = { id: orgIds[0], status: "active" };
  const other: OrganizerScope = { id: orgIds[1], status: "active" };

  let svc: typeof import("./offer-list-service");
  let dbModule: typeof import("@/lib/db");

  const cleanup = async () => {
    const { db, destinations, offers, organizers, packages, users } = dbModule;
    await db.delete(offers).where(inArray(offers.id, offIds));
    await db.delete(packages).where(inArray(packages.id, pkgIds));
    await db.delete(destinations).where(inArray(destinations.id, [destId]));
    await db.delete(organizers).where(inArray(organizers.id, orgIds));
    await db.delete(users).where(inArray(users.id, userIds));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./offer-list-service");
    const { db, destinations, offers, organizers, packages, users } = dbModule;
    try {
      await db.insert(users).values(
        userIds.map((id, i) => ({
          id,
          clerkId: `${P}-${i}`,
          email: `${P}-${i}@example.invalid`,
          role: "organizer" as const,
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
      await db.insert(destinations).values({
        id: destId,
        slug: P,
        name: `${P} destino`,
        region: "Región de prueba",
      });
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
        { ...base, id: pkgA, organizerId: orgIds[0], slug: `${P}-a`, title: `${P} A`, maxGroupSize: 8, status: "draft" },
        { ...base, id: pkgB, organizerId: orgIds[0], slug: `${P}-b`, title: `${P} B`, maxGroupSize: 12, status: "published" },
        { ...base, id: pkgC, organizerId: orgIds[1], slug: `${P}-c`, title: `${P} C`, maxGroupSize: 5, status: "published" },
      ]);
      const pct = { discountType: "percent" as const, discountValue: 10 };
      await db.insert(offers).values([
        { id: off.b1, packageId: pkgB, kind: "groups", ...pct, isActive: false, minPeople: 4, createdAt: new Date("2026-01-01T00:00:00Z") },
        { id: off.b2, packageId: pkgB, kind: "last_minute", discountType: "two_for_one", isActive: false, createdAt: new Date("2026-02-01T00:00:00Z") },
        { id: off.a1, packageId: pkgA, kind: "rainy_season", ...pct, validUntil: new Date("2030-01-01T00:00:00Z") },
        { id: off.c1, packageId: pkgC, kind: "groups", ...pct, isActive: false },
      ]);
    } catch (e) {
      await cleanup();
      throw e;
    }
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  it("AC8: con OrganizerScope devuelve solo las ofertas propias, con datos del paquete", async () => {
    const items = await svc.listOffers(mine);
    expect(items.map((i) => i.id).filter((id) => offIds.includes(id))).toHaveLength(3);
    expect(items.some((i) => i.id === off.c1)).toBe(false);
    const a = items.find((i) => i.id === off.a1);
    expect(a).toEqual({
      id: off.a1,
      packageId: pkgA,
      packageTitle: `${P} A`,
      packageStatus: "draft",
      packageMaxGroupSize: 8,
      kind: "rainy_season",
      discountType: "percent",
      discountValue: 10,
      minPeople: null,
      validUntil: new Date("2030-01-01T00:00:00Z"),
      isActive: true,
    });
    const theirs = await svc.listOffers(other);
    expect(theirs.filter((i) => offIds.includes(i.id)).map((i) => i.id)).toEqual([off.c1]);
  });

  it("AC8: ordena por título de paquete asc y created_at desc", async () => {
    const ids = (await svc.listOffers(mine)).map((i) => i.id);
    expect(ids.filter((id) => offIds.includes(id))).toEqual([off.a1, off.b2, off.b1]);
  });

  it("AC8: con 'all' devuelve las de todos los operadores", async () => {
    const ids = (await svc.listOffers("all")).map((i) => i.id).filter((id) => offIds.includes(id));
    expect(ids).toEqual([off.a1, off.b2, off.b1, off.c1]);
  });

  it("AC9: getOfferFormOptions devuelve paquetes del alcance (cualquier estado) por título", async () => {
    expect((await svc.getOfferFormOptions(mine)).packages).toEqual([
      { id: pkgA, title: `${P} A`, status: "draft", maxGroupSize: 8 },
      { id: pkgB, title: `${P} B`, status: "published", maxGroupSize: 12 },
    ]);
    const all = (await svc.getOfferFormOptions("all")).packages.map((p) => p.id);
    expect(all.filter((id) => pkgIds.includes(id))).toEqual([pkgA, pkgB, pkgC]);
  });
});
