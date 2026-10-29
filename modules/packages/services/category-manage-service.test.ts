import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("category-manage-service (db)", () => {
  const id = (n: number) => `00000000-0000-4000-8000-0000002800${n.toString(16).padStart(2, "0")}`;
  const USER_ID = id(1);
  const ORG_ID = id(2);
  const DEST_ID = id(3);
  const PKG_IDS = [id(0x10), id(0x11)]; // draft y published
  const CAT_USED = id(0x20);
  const CAT_FREE = id(0x21);
  const SLUGS = ["nueva-cat-manage", "test-cat-manage-usada", "test-cat-manage-libre"];

  let svc: typeof import("./category-manage-service");
  let dbModule: typeof import("@/lib/db");

  const cleanup = async () => {
    const { db, packages, categories, destinations, organizers, users } = dbModule;
    await db.delete(packages).where(inArray(packages.id, PKG_IDS)); // package_categories en cascade
    await db.delete(categories).where(inArray(categories.slug, SLUGS));
    await db.delete(categories).where(inArray(categories.id, [CAT_USED, CAT_FREE]));
    await db.delete(destinations).where(eq(destinations.id, DEST_ID));
    await db.delete(organizers).where(eq(organizers.id, ORG_ID));
    await db.delete(users).where(eq(users.id, USER_ID));
  };

  const bySlug = async (slug: string) => {
    const { db, categories } = dbModule;
    return db.select().from(categories).where(eq(categories.slug, slug));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./category-manage-service");
    await cleanup();
    const { db, users, organizers, destinations, categories, packages, packageCategories } = dbModule;
    await db.insert(users).values({
      id: USER_ID,
      clerkId: "test_category_manage",
      email: "test-category-manage@example.invalid",
      role: "organizer",
    });
    await db.insert(organizers).values({
      id: ORG_ID,
      userId: USER_ID,
      businessName: "Operador de prueba categorías",
      ruc: "20000000000",
      whatsapp: "+51900000000",
      status: "active",
    });
    await db.insert(destinations).values({
      id: DEST_ID,
      slug: "test-cat-manage-destino",
      name: "Destino de prueba categorías",
      region: "Región de prueba",
    });
    await db.insert(categories).values([
      { id: CAT_USED, slug: SLUGS[1], name: "Zz Usada de prueba" },
      { id: CAT_FREE, slug: SLUGS[2], name: "Zz Libre de prueba" },
    ]);
    const base = {
      organizerId: ORG_ID,
      destinationId: DEST_ID,
      kind: "package" as const,
      blurb: "Resumen de prueba del paquete",
      durationDays: 2,
      nights: 1,
      priceCents: 25_000,
      maxGroupSize: 10,
      languages: ["es"],
    };
    await db.insert(packages).values([
      { ...base, id: PKG_IDS[0], slug: "test-cat-manage-draft", title: "Borrador", status: "draft" },
      { ...base, id: PKG_IDS[1], slug: "test-cat-manage-pub", title: "Publicado", status: "published" },
    ]);
    await db.insert(packageCategories).values(PKG_IDS.map((packageId) => ({ packageId, categoryId: CAT_USED })));
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  it("AC5: crear asigna slug = slugify(name)", async () => {
    const res = await svc.createCategory({ name: "Nueva Cat Manage" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const { db, categories } = dbModule;
    const [row] = await db.select().from(categories).where(eq(categories.id, res.id));
    expect(row.slug).toBe("nueva-cat-manage");
    expect(row.name).toBe("Nueva Cat Manage");
    await db.delete(categories).where(eq(categories.id, res.id));
  });

  it("AC5: slug duplicado -> SLUG_TAKEN con fieldErrors.name y sin fila nueva", async () => {
    // "TEST CAT MANAGE LIBRE" -> "test-cat-manage-libre" (ya existe como CAT_FREE)
    const res = await svc.createCategory({ name: "TEST cat manage Libre" });
    expect(res).toMatchObject({ ok: false, code: "SLUG_TAKEN", fieldErrors: { name: expect.any(String) } });
    expect(await bySlug(SLUGS[2])).toHaveLength(1);
  });

  it("AC6: renombrar cambia name y conserva slug; mismo nombre es válido", async () => {
    expect(await svc.updateCategory(CAT_FREE, { name: "Zz Libre renombrada" })).toEqual({ ok: true });
    const [row] = await bySlug(SLUGS[2]);
    expect(row.name).toBe("Zz Libre renombrada");
    expect(await svc.updateCategory(CAT_FREE, { name: "Zz Libre renombrada" })).toEqual({ ok: true });
    expect((await bySlug(SLUGS[2]))[0].slug).toBe(SLUGS[2]);
  });

  it("AC6: id inexistente -> NOT_FOUND", async () => {
    expect(await svc.updateCategory(id(0xff), { name: "Nada" })).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("AC8: listCategoriesWithUsage cuenta paquetes draft y published y 0 si ninguno", async () => {
    const list = await svc.listCategoriesWithUsage();
    expect(list.find((c) => c.id === CAT_USED)).toEqual({
      id: CAT_USED,
      slug: SLUGS[1],
      name: "Zz Usada de prueba",
      packageCount: 2,
    });
    expect(list.find((c) => c.id === CAT_FREE)?.packageCount).toBe(0);
    // Orden por nombre asc: "Zz Libre…" < "Zz Usada…".
    expect(list.findIndex((c) => c.id === CAT_FREE)).toBeLessThan(list.findIndex((c) => c.id === CAT_USED));
  });

  it("AC7: borrar en uso -> HAS_PACKAGES y no borra", async () => {
    expect(await svc.deleteCategory(CAT_USED)).toMatchObject({ ok: false, code: "HAS_PACKAGES" });
    expect(await bySlug(SLUGS[1])).toHaveLength(1);
  });

  it("AC7: inexistente -> NOT_FOUND; sin uso -> borra", async () => {
    expect(await svc.deleteCategory(id(0xff))).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(await svc.deleteCategory(CAT_FREE)).toEqual({ ok: true });
    expect(await bySlug(SLUGS[2])).toHaveLength(0);
  });
});
