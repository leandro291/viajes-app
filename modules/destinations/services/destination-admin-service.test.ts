import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)(
  "destination-admin-service (db)",
  () => {
    const id = (n: number) =>
      `00000000-0000-4000-8000-0000002812${n.toString(16).padStart(2, "0")}`;
    const USER_ID = id(1);
    const ORG_ID = id(2);
    const DEST_ID = id(3);
    const DEST_EMPTY = id(4);
    const PKG_IDS = [id(0x10), id(0x11)]; // draft y published
    const SLUGS = ["test-dest-admin", "test-dest-admin-vacio"];

    let svc: typeof import("./destination-admin-service");
    let dbModule: typeof import("@/lib/db");

    const cleanup = async () => {
      const { db, packages, destinations, organizers, users } = dbModule;
      await db.delete(packages).where(inArray(packages.id, PKG_IDS));
      await db.delete(destinations).where(inArray(destinations.slug, SLUGS)); // hijas en cascade
      await db.delete(organizers).where(eq(organizers.id, ORG_ID));
      await db.delete(users).where(eq(users.id, USER_ID));
    };

    beforeAll(async () => {
      dbModule = await import("@/lib/db");
      svc = await import("./destination-admin-service");
      await cleanup();
      const {
        db,
        users,
        organizers,
        destinations,
        packages,
        destinationClimateMonths,
        destinationSights,
        destinationFaqs,
      } = dbModule;
      await db.insert(users).values({
        id: USER_ID,
        clerkId: "test_destination_admin",
        email: "test-destination-admin@example.invalid",
        role: "organizer",
      });
      await db.insert(organizers).values({
        id: ORG_ID,
        userId: USER_ID,
        businessName: "Operador de prueba admin destinos",
        ruc: "20000000002",
        whatsapp: "+51900000002",
        status: "active",
      });
      await db.insert(destinations).values([
        {
          id: DEST_ID,
          slug: SLUGS[0],
          name: "Zz Destino admin",
          region: "Región",
          heroImageUrl: "/seed/a.jpg",
        },
        {
          id: DEST_EMPTY,
          slug: SLUGS[1],
          name: "Zz Destino admin vacío",
          region: "Región",
        },
      ]);
      await db.insert(packages).values(
        (["draft", "published"] as const).map((status, i) => ({
          id: PKG_IDS[i],
          organizerId: ORG_ID,
          destinationId: DEST_ID,
          kind: "package" as const,
          slug: `test-dest-admin-pkg-${i}`,
          title: `Paquete ${status}`,
          blurb: "Resumen de prueba del paquete",
          durationDays: 2,
          nights: 1,
          priceCents: 25_000,
          maxGroupSize: 10,
          languages: ["es"],
          status,
        })),
      );
      // Clima parcial (enero y marzo), lugares y preguntas insertados en desorden.
      await db.insert(destinationClimateMonths).values([
        { destinationId: DEST_ID, month: 3, season: "rainy" },
        { destinationId: DEST_ID, month: 1, season: "dry" },
      ]);
      await db.insert(destinationSights).values([
        {
          destinationId: DEST_ID,
          name: "Segundo",
          description: "Descripción larga B",
          imageUrl: "/seed/b.jpg",
          sortOrder: 1,
          lat: -13.5,
          lng: -71.9,
        },
        {
          destinationId: DEST_ID,
          name: "Primero",
          description: "Descripción larga A",
          imageUrl: "/seed/a.jpg",
          sortOrder: 0,
        },
      ]);
      await db.insert(destinationFaqs).values([
        {
          destinationId: DEST_ID,
          question: "¿Segunda pregunta?",
          answer: "Respuesta dos larga",
          sortOrder: 1,
        },
        {
          destinationId: DEST_ID,
          question: "¿Primera pregunta?",
          answer: "Respuesta uno larga",
          sortOrder: 0,
        },
      ]);
    });

    afterAll(async () => {
      if (dbModule) await cleanup();
    });

    it("AC17: listAdminDestinations devuelve conteos correctos", async () => {
      const list = await svc.listAdminDestinations();
      expect(list.find((d) => d.id === DEST_ID)).toEqual({
        id: DEST_ID,
        slug: SLUGS[0],
        name: "Zz Destino admin",
        region: "Región",
        heroImageUrl: "/seed/a.jpg",
        packageCount: 2,
        publishedCount: 1,
        sightCount: 2,
      });
      expect(list.find((d) => d.id === DEST_EMPTY)).toMatchObject({
        heroImageUrl: null,
        packageCount: 0,
        publishedCount: 0,
        sightCount: 0,
      });
      const names = list.map((d) => d.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it("AC17: getDestinationForEdit inexistente -> null", async () => {
      expect(await svc.getDestinationForEdit(id(0xff))).toBeNull();
    });

    it("AC17: clima parcial rellena null; lugares y preguntas por sort_order", async () => {
      const edit = await svc.getDestinationForEdit(DEST_ID);
      expect(edit).toMatchObject({ id: DEST_ID, slug: SLUGS[0] });
      const v = edit!.values;
      expect(v.climate).toHaveLength(12);
      expect(v.climate[0]).toBe("dry");
      expect(v.climate[2]).toBe("rainy");
      expect(v.climate.filter((m) => m === null)).toHaveLength(10);
      expect(v.sights.map((s) => s.name)).toEqual(["Primero", "Segundo"]);
      expect(v.sights[1]).toMatchObject({ lat: -13.5, lng: -71.9 });
      expect(v.faqs.map((f) => f.question)).toEqual([
        "¿Primera pregunta?",
        "¿Segunda pregunta?",
      ]);
    });

    it("AC17: destino sin clima -> 12 null", async () => {
      const edit = await svc.getDestinationForEdit(DEST_EMPTY);
      expect(edit!.values.climate).toEqual(Array(12).fill(null));
    });
  },
);
