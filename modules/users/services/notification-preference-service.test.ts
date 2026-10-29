import { and, eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("notification-preference-service (db)", () => {
  const RUN = crypto.randomUUID();

  let service: typeof import("./notification-preference-service");
  let dbModule: typeof import("@/lib/db");

  const createUser = async (tag: string) => {
    const { db, users } = dbModule;
    const [user] = await db
      .insert(users)
      .values({ clerkId: `user_test_${RUN}_${tag}`, email: `test-${RUN}-${tag}@wayra.test` })
      .returning({ id: users.id });
    return user.id;
  };

  const countRows = async (userId: string, key: "new_booking" | "cancellations" | "weekly_summary") => {
    const { db, notificationPreferences: prefs } = dbModule;
    return db.select().from(prefs).where(and(eq(prefs.userId, userId), eq(prefs.key, key)));
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    service = await import("./notification-preference-service");
  });

  afterAll(async () => {
    // notification_preferences cae en cascada al borrar el usuario.
    const { db, users } = dbModule;
    await db.delete(users).where(like(users.clerkId, `user_test_${RUN}_%`));
  });

  it("AC10: sin filas devuelve los defaults y no inserta", async () => {
    const userId = await createUser("defaults");
    expect(await service.getNotificationPreferences(userId)).toEqual({
      new_booking: true,
      cancellations: true,
      weekly_summary: false,
    });
    expect(await countRows(userId, "new_booking")).toHaveLength(0);
  });

  it("AC11: set inserta y get lo refleja", async () => {
    const userId = await createUser("insert");
    await service.setNotificationPreference(userId, "weekly_summary", true);
    expect((await service.getNotificationPreferences(userId)).weekly_summary).toBe(true);
  });

  it("AC12: set repetido actualiza sin duplicar (PK)", async () => {
    const userId = await createUser("upsert");
    await service.setNotificationPreference(userId, "new_booking", false);
    await service.setNotificationPreference(userId, "new_booking", false);
    await service.setNotificationPreference(userId, "new_booking", true);
    const rows = await countRows(userId, "new_booking");
    expect(rows).toHaveLength(1);
    expect(rows[0].enabled).toBe(true);
  });

  it("AC12: no toca las preferencias de otro usuario", async () => {
    const a = await createUser("a");
    const b = await createUser("b");
    await service.setNotificationPreference(a, "cancellations", false);
    expect((await service.getNotificationPreferences(b)).cancellations).toBe(true);
    expect(await countRows(b, "cancellations")).toHaveLength(0);
  });
});
