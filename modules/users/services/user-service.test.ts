import { describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("user-service (db)", () => {
  it("AC9: devuelve { id, email } del usuario sembrado", async () => {
    const { getUserByClerkId } = await import("./user-service");
    const user = await getUserByClerkId("seed_customer_01");
    expect(user).toEqual({ id: expect.any(String), email: "maria.q@correo.com" });
  });

  it("AC9: clerkId desconocido devuelve null", async () => {
    const { getUserByClerkId } = await import("./user-service");
    expect(await getUserByClerkId("clerk_inexistente_xyz")).toBeNull();
  });
});
