import { describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("organizer-service (db)", () => {
  it("AC7: devuelve el perfil del operador sembrado", async () => {
    const { getOrganizerByClerkId } = await import("./organizer-service");
    const organizer = await getOrganizerByClerkId("seed_organizer");
    expect(organizer).toEqual({
      id: expect.any(String),
      businessName: "Wayra Perú S.A.C.",
      ruc: "20000000001",
      whatsapp: "+51 900 000 003",
      status: "active",
    });
  });

  it("AC7: clerkId de un customer devuelve null", async () => {
    const { getOrganizerByClerkId } = await import("./organizer-service");
    expect(await getOrganizerByClerkId("seed_customer_01")).toBeNull();
  });

  it("AC7: clerkId desconocido devuelve null", async () => {
    const { getOrganizerByClerkId } = await import("./organizer-service");
    expect(await getOrganizerByClerkId("clerk_inexistente_xyz")).toBeNull();
  });
});
