import { eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("newsletter-service (db)", () => {
  const RUN = crypto.randomUUID();
  const emailFor = (tag: string) => `test-${RUN}-${tag}@wayra.test`;

  let service: typeof import("./newsletter-service");
  let dbModule: typeof import("@/lib/db");

  const findRows = async (email: string) => {
    const { db, newsletterSubscribers } = dbModule;
    return db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    service = await import("./newsletter-service");
  });

  afterAll(async () => {
    const { db, newsletterSubscribers } = dbModule;
    await db.delete(newsletterSubscribers).where(like(newsletterSubscribers.email, `test-${RUN}-%`));
  });

  it("AC11: inserta un correo nuevo con unsubscribed_at nulo", async () => {
    const email = emailFor("new");
    await service.subscribeEmail(email);
    const rows = await findRows(email);
    expect(rows).toHaveLength(1);
    expect(rows[0].unsubscribedAt).toBeNull();
  });

  it("AC11: un segundo llamado no duplica ni lanza y conserva subscribed_at", async () => {
    const email = emailFor("repeat");
    await service.subscribeEmail(email);
    const [first] = await findRows(email);
    await expect(service.subscribeEmail(email)).resolves.toBeUndefined();
    const rows = await findRows(email);
    expect(rows).toHaveLength(1);
    expect(rows[0].subscribedAt).toEqual(first.subscribedAt);
  });

  it("AC11: reactiva (unsubscribed_at = null) una fila dada de baja y conserva subscribed_at", async () => {
    const { db, newsletterSubscribers } = dbModule;
    const email = emailFor("resub");
    await service.subscribeEmail(email);
    const [first] = await findRows(email);
    await db
      .update(newsletterSubscribers)
      .set({ unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribers.email, email));

    await service.subscribeEmail(email);
    const rows = await findRows(email);
    expect(rows).toHaveLength(1);
    expect(rows[0].unsubscribedAt).toBeNull();
    expect(rows[0].subscribedAt).toEqual(first.subscribedAt);
  });
});
