import type { WebhookEvent } from "@clerk/nextjs/webhooks";
import { eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("clerk-sync-service (db)", () => {
  const RUN = crypto.randomUUID();
  const clerkIdFor = (tag: string) => `user_test_${RUN}_${tag}`;
  const emailFor = (tag: string) => `test-${RUN}-${tag}@wayra.test`;

  let service: typeof import("./clerk-sync-service");
  let dbModule: typeof import("@/lib/db");

  const event = (type: string, data: Record<string, unknown>) => ({ type, data }) as unknown as WebhookEvent;

  const userEvent = (type: "user.created" | "user.updated", tag: string, extra: Record<string, unknown> = {}) =>
    event(type, {
      id: clerkIdFor(tag),
      first_name: "Ana",
      last_name: "Quispe",
      primary_email_address_id: "idn_1",
      primary_phone_number_id: null,
      email_addresses: [{ id: "idn_1", email_address: emailFor(tag) }],
      phone_numbers: [],
      public_metadata: {},
      ...extra,
    });

  const findRows = async (tag: string) => {
    const { db, users } = dbModule;
    return db.select().from(users).where(eq(users.clerkId, clerkIdFor(tag)));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    service = await import("./clerk-sync-service");
  });

  afterAll(async () => {
    const { db, users } = dbModule;
    await db.delete(users).where(like(users.clerkId, `user_test_${RUN}_%`));
  });

  it("user.created inserta con rol customer por defecto", async () => {
    await service.handleClerkEvent(userEvent("user.created", "new"));
    const rows = await findRows("new");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: emailFor("new"), role: "customer" });
  });

  it("repetir el mismo evento no duplica ni lanza", async () => {
    await service.handleClerkEvent(userEvent("user.created", "repeat"));
    await expect(service.handleClerkEvent(userEvent("user.created", "repeat"))).resolves.toBeUndefined();
    expect(await findRows("repeat")).toHaveLength(1);
  });

  it("user.updated sin user.created previo hace upsert y actualiza el rol", async () => {
    await service.handleClerkEvent(userEvent("user.updated", "role", { public_metadata: { role: "organizer" } }));
    expect((await findRows("role"))[0].role).toBe("organizer");
    await service.handleClerkEvent(userEvent("user.updated", "role"));
    expect((await findRows("role"))[0].role).toBe("customer");
  });

  it("un Clerk sin teléfono no pisa el teléfono ya guardado", async () => {
    const { db, users } = dbModule;
    await service.handleClerkEvent(userEvent("user.created", "phone"));
    await db.update(users).set({ phone: "+51999999999" }).where(eq(users.clerkId, clerkIdFor("phone")));
    await service.handleClerkEvent(userEvent("user.updated", "phone", { first_name: "Luz" }));
    expect((await findRows("phone"))[0]).toMatchObject({ firstName: "Luz", phone: "+51999999999" });
  });

  it("user.deleted borra la fila; repetirlo o borrar uno inexistente no lanza", async () => {
    await service.handleClerkEvent(userEvent("user.created", "del"));
    const deleted = event("user.deleted", { id: clerkIdFor("del"), deleted: true });
    await service.handleClerkEvent(deleted);
    expect(await findRows("del")).toHaveLength(0);
    await expect(service.handleClerkEvent(deleted)).resolves.toBeUndefined();
  });

  it("user.deleted con reservas u operador no borra y no lanza (FK restrict)", async () => {
    const { db, organizers } = dbModule;
    await service.handleClerkEvent(userEvent("user.created", "fk"));
    const [user] = await findRows("fk");
    await db.insert(organizers).values({ userId: user.id, businessName: "Test SAC", ruc: "20000000001", whatsapp: "51900000000" });
    try {
      await expect(
        service.handleClerkEvent(event("user.deleted", { id: clerkIdFor("fk"), deleted: true })),
      ).resolves.toBeUndefined();
      expect(await findRows("fk")).toHaveLength(1);
    } finally {
      await db.delete(organizers).where(eq(organizers.userId, user.id));
    }
  });

  it("sin correo principal se ignora sin lanzar ni insertar", async () => {
    await expect(
      service.handleClerkEvent(userEvent("user.created", "noemail", { primary_email_address_id: null })),
    ).resolves.toBeUndefined();
    expect(await findRows("noemail")).toHaveLength(0);
  });
});
