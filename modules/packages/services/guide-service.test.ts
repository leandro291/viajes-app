import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { OrganizerScope } from "../types/package-manage";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("guide-service (db)", () => {
  const userIds = ["00000000-0000-4000-8000-000000210001", "00000000-0000-4000-8000-000000210002"];
  const orgIds = ["00000000-0000-4000-8000-000000210011", "00000000-0000-4000-8000-000000210012"];
  const DEP_ID = "00000000-0000-4000-8000-000000210021";
  const mine: OrganizerScope = { id: orgIds[0], status: "active" };
  const other: OrganizerScope = { id: orgIds[1], status: "active" };

  let svc: typeof import("./guide-service");
  let dbModule: typeof import("@/lib/db");
  let seedId: typeof import("@/lib/db/seed/helpers").seedId;

  const cleanup = async () => {
    const { db, departures, guides, organizers, users } = dbModule;
    await db.delete(departures).where(eq(departures.id, DEP_ID));
    await db.delete(guides).where(inArray(guides.organizerId, orgIds));
    await db.delete(organizers).where(inArray(organizers.id, orgIds));
    await db.delete(users).where(inArray(users.id, userIds));
  };

  const rowOf = async (id: string) => {
    const { db, guides } = dbModule;
    const [row] = await db.select().from(guides).where(eq(guides.id, id));
    return row;
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./guide-service");
    seedId = (await import("@/lib/db/seed/helpers")).seedId;
    await cleanup();
    const { db, organizers, users } = dbModule;
    await db.insert(users).values(
      userIds.map((id, i) => ({
        id,
        clerkId: `test_guide_service_${i}`,
        email: `test-guide-service-${i}@example.invalid`,
        role: "organizer" as const,
      })),
    );
    await db.insert(organizers).values(
      orgIds.map((id, i) => ({
        id,
        userId: userIds[i],
        businessName: `Operador de prueba ${i}`,
        ruc: "20000000000",
        whatsapp: "+51900000000",
        status: "active" as const,
      })),
    );
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  it("AC3: createGuide usa el organizer_id del scope y listGuides ordena por nombre", async () => {
    const b = await svc.createGuide(mine, { name: "Beto", phone: "+51 900 000 002" });
    const a = await svc.createGuide(mine, { name: "Ana", phone: "+51 900 000 001" });
    expect(b.ok && a.ok).toBe(true);
    if (!a.ok) return;
    expect((await rowOf(a.id)).organizerId).toBe(mine.id);
    expect(await svc.listGuides(mine.id)).toEqual([
      { id: a.id, name: "Ana", phone: "+51 900 000 001" },
      { id: expect.any(String), name: "Beto", phone: "+51 900 000 002" },
    ]);
  });

  it("AC3: listGuides solo devuelve las guías del operador", async () => {
    const g = await svc.createGuide(other, { name: "Ajena", phone: "+51 900 000 003" });
    expect(g.ok).toBe(true);
    const names = (await svc.listGuides(mine.id)).map((x) => x.name);
    expect(names).not.toContain("Ajena");
    expect((await svc.listGuides(other.id)).map((x) => x.name)).toEqual(["Ajena"]);
  });

  it("AC3: updateGuide actualiza una guía propia", async () => {
    const g = await svc.createGuide(mine, { name: "Carla", phone: "+51 900 000 004" });
    if (!g.ok) throw new Error("setup");
    expect(await svc.updateGuide(mine, g.id, { name: "Carla P.", phone: "900000005" })).toEqual({
      ok: true,
    });
    expect(await rowOf(g.id)).toMatchObject({ name: "Carla P.", phone: "900000005" });
  });

  it("AC3: update/delete de una guía ajena -> NOT_FOUND y la fila no cambia", async () => {
    const g = await svc.createGuide(other, { name: "Intacta", phone: "+51 900 000 006" });
    if (!g.ok) throw new Error("setup");
    const upd = await svc.updateGuide(mine, g.id, { name: "Hackeada", phone: "111111" });
    const del = await svc.deleteGuide(mine, g.id);
    expect(upd).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(del).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(await rowOf(g.id)).toMatchObject({
      organizerId: other.id,
      name: "Intacta",
      phone: "+51 900 000 006",
    });
  });

  it("AC3: id inexistente -> NOT_FOUND", async () => {
    const id = "00000000-0000-4000-8000-0000002100ff";
    expect(await svc.updateGuide(mine, id, { name: "Nadie", phone: "111111" })).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
    expect(await svc.deleteGuide(mine, id)).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("AC4: suspended bloquea crear/editar/borrar y no escribe nada", async () => {
    const g = await svc.createGuide(mine, { name: "Protegida", phone: "+51 900 000 007" });
    if (!g.ok) throw new Error("setup");
    const suspended: OrganizerScope = { ...mine, status: "suspended" };
    const before = (await svc.listGuides(mine.id)).length;

    const results = [
      await svc.createGuide(suspended, { name: "Nueva", phone: "+51 900 000 008" }),
      await svc.updateGuide(suspended, g.id, { name: "Cambiada", phone: "111111" }),
      await svc.deleteGuide(suspended, g.id),
    ];
    for (const r of results) expect(r).toMatchObject({ ok: false, code: "ORGANIZER_SUSPENDED" });
    expect(await svc.listGuides(mine.id)).toHaveLength(before);
    expect(await rowOf(g.id)).toMatchObject({ name: "Protegida" });
  });

  it("AC4: pending puede crear, editar y borrar", async () => {
    const pending: OrganizerScope = { ...mine, status: "pending" };
    const g = await svc.createGuide(pending, { name: "Pendiente", phone: "+51 900 000 009" });
    if (!g.ok) throw new Error("pending debería poder crear");
    expect(await svc.updateGuide(pending, g.id, { name: "Pend. 2", phone: "900000009" })).toEqual({
      ok: true,
    });
    expect(await rowOf(g.id)).toMatchObject({ name: "Pend. 2" });
    expect(await svc.deleteGuide(pending, g.id)).toEqual({ ok: true });
    expect(await rowOf(g.id)).toBeUndefined();
  });

  it("AC4: borrar una guía con salida deja departures.guide_id = null", async () => {
    const { db, departures } = dbModule;
    const g = await svc.createGuide(mine, { name: "Con salida", phone: "+51 900 000 010" });
    if (!g.ok) throw new Error("setup");
    await db.insert(departures).values({
      id: DEP_ID,
      packageId: seedId("package:machu-picchu-magico"),
      guideId: g.id,
      startsAt: new Date("2099-01-01T12:00:00Z"),
      capacity: 5,
    });
    expect(await svc.deleteGuide(mine, g.id)).toEqual({ ok: true });
    const [dep] = await db.select().from(departures).where(eq(departures.id, DEP_ID));
    expect(dep.guideId).toBeNull();
  });
});
