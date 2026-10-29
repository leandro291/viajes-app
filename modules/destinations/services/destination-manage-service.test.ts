import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DestinationInput } from "../schemas/destination-schema";

const input = (over: Partial<DestinationInput> = {}): DestinationInput => ({
  name: "Test Dest Manage",
  region: "Región de prueba",
  heroImageUrl: "/seed/test.jpg",
  tagline: null,
  description: null,
  altitudeM: null,
  bestSeasonText: null,
  fromLimaText: null,
  howToGetText: null,
  tipsText: null,
  climate: Array(12).fill(null),
  sights: [],
  faqs: [],
  ...over,
});

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("destination-manage-service (db)", () => {
  const id = (n: number) => `00000000-0000-4000-8000-0000002811${n.toString(16).padStart(2, "0")}`;
  const USER_ID = id(1);
  const ORG_ID = id(2);
  const DEST_WITH_PKG = id(3);
  const PKG_ID = id(0x10);
  const SLUG = "test-dest-manage";
  const SLUGS = [SLUG, "test-dest-rollback", "test-dest-manage-con-paquete"];

  let svc: typeof import("./destination-manage-service");
  let dbModule: typeof import("@/lib/db");

  const bySlug = async (slug: string) => {
    const { db, destinations } = dbModule;
    return db.select().from(destinations).where(eq(destinations.slug, slug));
  };

  const cleanup = async () => {
    const { db, packages, destinations, organizers, users } = dbModule;
    await db.delete(packages).where(eq(packages.id, PKG_ID));
    await db.delete(destinations).where(inArray(destinations.slug, SLUGS)); // hijas en cascade
    await db.delete(organizers).where(eq(organizers.id, ORG_ID));
    await db.delete(users).where(eq(users.id, USER_ID));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./destination-manage-service");
    await cleanup();
    const { db, users, organizers, destinations, packages } = dbModule;
    await db.insert(users).values({
      id: USER_ID,
      clerkId: "test_destination_manage",
      email: "test-destination-manage@example.invalid",
      role: "organizer",
    });
    await db.insert(organizers).values({
      id: ORG_ID,
      userId: USER_ID,
      businessName: "Operador de prueba destinos",
      ruc: "20000000001",
      whatsapp: "+51900000001",
      status: "active",
    });
    await db.insert(destinations).values({
      id: DEST_WITH_PKG,
      slug: SLUGS[2],
      name: "Destino con paquete",
      region: "Región de prueba",
    });
    await db.insert(packages).values({
      id: PKG_ID,
      organizerId: ORG_ID,
      destinationId: DEST_WITH_PKG,
      kind: "package",
      slug: "test-dest-manage-pkg",
      title: "Borrador",
      blurb: "Resumen de prueba del paquete",
      durationDays: 2,
      nights: 1,
      priceCents: 25_000,
      maxGroupSize: 10,
      languages: ["es"],
      status: "draft",
    });
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  const children = async (destinationId: string) => {
    const { db, destinationClimateMonths, destinationSights, destinationFaqs } = dbModule;
    const where = <T extends { destinationId: unknown }>(t: T) => eq(t.destinationId as never, destinationId);
    return {
      climate: await db.select().from(destinationClimateMonths).where(where(destinationClimateMonths)),
      sights: await db.select().from(destinationSights).where(where(destinationSights)),
      faqs: await db.select().from(destinationFaqs).where(where(destinationFaqs)),
    };
  };

  let createdId = "";

  it("AC14: crear inserta destino e hijas con month y sort_order", async () => {
    const res = await svc.createDestination(
      input({
        climate: Array.from({ length: 12 }, (_, i) => (i < 6 ? "dry" : "rainy")),
        sights: [
          { name: "Lugar A", description: "Descripción A larga", imageUrl: "/seed/a.jpg", lat: null, lng: null },
          { name: "Lugar B", description: "Descripción B larga", imageUrl: "/seed/b.jpg", lat: -13.5, lng: -71.9 },
        ],
        faqs: [{ question: "¿Pregunta uno?", answer: "Respuesta uno larga" }],
      }),
    );
    expect(res).toMatchObject({ ok: true, slug: SLUG });
    if (!res.ok) return;
    createdId = res.id;
    const kids = await children(res.id);
    expect(kids.climate.map((c) => c.month).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(kids.sights.map((s) => [s.name, s.sortOrder]).sort()).toEqual([["Lugar A", 0], ["Lugar B", 1]]);
    expect(kids.faqs.map((f) => f.sortOrder)).toEqual([0]);
  });

  it("AC14: slug duplicado -> SLUG_TAKEN con fieldErrors.name", async () => {
    const res = await svc.createDestination(input({ name: "TEST dest MANAGE" }));
    expect(res).toMatchObject({ ok: false, code: "SLUG_TAKEN", fieldErrors: { name: expect.any(String) } });
    expect(await bySlug(SLUG)).toHaveLength(1);
  });

  it("AC14: si falla un insert hijo no queda nada (rollback)", async () => {
    const bad = Array.from({ length: 12 }, () => "bogus") as unknown as DestinationInput["climate"];
    await expect(svc.createDestination(input({ name: "Test Dest Rollback", climate: bad }))).rejects.toThrow();
    expect(await bySlug("test-dest-rollback")).toHaveLength(0);
  });

  it("AC15: editar reemplaza hijas y conserva slug", async () => {
    const res = await svc.updateDestination(
      createdId,
      input({
        name: "Nombre Cambiado",
        faqs: [
          { question: "¿Nueva uno?", answer: "Respuesta nueva uno" },
          { question: "¿Nueva dos?", answer: "Respuesta nueva dos" },
        ],
      }),
    );
    expect(res).toEqual({ ok: true });
    const [row] = await bySlug(SLUG);
    expect(row).toMatchObject({ id: createdId, name: "Nombre Cambiado" });
    const kids = await children(createdId);
    expect(kids.climate).toHaveLength(0);
    expect(kids.sights).toHaveLength(0);
    expect(kids.faqs.map((f) => f.sortOrder).sort()).toEqual([0, 1]);
  });

  it("AC15: id inexistente -> NOT_FOUND", async () => {
    expect(await svc.updateDestination(id(0xff), input())).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("AC16: borrar con paquete (draft) -> HAS_PACKAGES sin cambios", async () => {
    expect(await svc.deleteDestination(DEST_WITH_PKG)).toMatchObject({ ok: false, code: "HAS_PACKAGES" });
    expect(await bySlug(SLUGS[2])).toHaveLength(1);
  });

  it("AC16: inexistente -> NOT_FOUND; sin paquetes borra y cascade limpia hijas", async () => {
    expect(await svc.deleteDestination(id(0xff))).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(await svc.deleteDestination(createdId)).toEqual({ ok: true });
    expect(await bySlug(SLUG)).toHaveLength(0);
    const kids = await children(createdId);
    expect(kids.faqs).toHaveLength(0);
  });
});
