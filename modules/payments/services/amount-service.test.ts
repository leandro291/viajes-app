import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { calculateOffer } from "@/modules/offers/pricing";

import { penToUsdCents } from "../utils/currency";
import { PaymentAmountError, type PaymentAmountErrorCode } from "../utils/payment-error";

const RATE = 3.75;

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("amount-service (db)", () => {
  // Ids propios de este archivo (prefijo 0013): no pisan los del seed ni los de otros tests.
  const DRAFT_PKG_ID = "00000000-0000-4000-8000-000000130001";
  const DRAFT_PKG_SLUG = "test-draft-package-payments-t5";
  const VALID_ID = "00000000-0000-4000-8000-000000130011";
  const EXPIRED_ID = "00000000-0000-4000-8000-000000130012";
  const INACTIVE_ID = "00000000-0000-4000-8000-000000130013";
  const OTHER_PKG_ID = "00000000-0000-4000-8000-000000130014";
  const DRAFT_OFFER_ID = "00000000-0000-4000-8000-000000130015";
  const MISSING_ID = "00000000-0000-4000-8000-000000130099";
  const TEST_OFFER_IDS = [VALID_ID, EXPIRED_ID, INACTIVE_ID, OTHER_PKG_ID, DRAFT_OFFER_ID];

  let service: typeof import("./amount-service");
  let dbModule: typeof import("@/lib/db");
  let PUBLISHED_ID: string; // package:machu-picchu-magico
  let OTHER_PUBLISHED_ID: string; // package:cusco-valle-sagrado
  let unitCents: number;

  // Solo toca ids propios: primero las ofertas y luego el paquete (onDelete: restrict).
  async function cleanup() {
    const { db, offers, packages } = dbModule;
    await db.delete(offers).where(inArray(offers.id, TEST_OFFER_IDS));
    await db.delete(packages).where(eq(packages.id, DRAFT_PKG_ID));
  }

  async function expectCode(promise: Promise<unknown>, code: PaymentAmountErrorCode) {
    const error = await promise.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(PaymentAmountError);
    expect((error as PaymentAmountError).code).toBe(code);
  }

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    service = await import("./amount-service");
    const seedHelpers = await import("@/lib/db/seed/helpers");
    const seedPackages = await import("@/lib/db/seed/data/packages");

    PUBLISHED_ID = seedHelpers.seedId("package:machu-picchu-magico");
    OTHER_PUBLISHED_ID = seedHelpers.seedId("package:cusco-valle-sagrado");
    unitCents = seedPackages.seedPackages.find((p) => p.id === PUBLISHED_ID)!.priceCents;

    const { db, offers, packages } = dbModule;
    try {
      await cleanup();
      await db.insert(packages).values({
        id: DRAFT_PKG_ID,
        organizerId: seedHelpers.seedId("organizer:wayra"),
        destinationId: seedHelpers.seedId("destination:cusco"),
        kind: "package",
        slug: DRAFT_PKG_SLUG,
        title: "Borrador de prueba (payments)",
        blurb: "No debe verse",
        durationDays: 3,
        nights: 2,
        priceCents: 100,
        maxGroupSize: 10,
        languages: ["es"],
        status: "draft",
      });

      const base = {
        kind: "last_minute",
        discountType: "percent",
        discountValue: 10,
        isActive: true,
        validUntil: null,
      } as const;
      await db.insert(offers).values([
        { ...base, id: VALID_ID, packageId: PUBLISHED_ID },
        {
          ...base,
          id: EXPIRED_ID,
          packageId: PUBLISHED_ID,
          validUntil: new Date(Date.now() - 86_400_000),
        },
        { ...base, id: INACTIVE_ID, packageId: PUBLISHED_ID, isActive: false },
        // Vigente, pero de otro paquete publicado.
        { ...base, id: OTHER_PKG_ID, packageId: OTHER_PUBLISHED_ID },
        // Vigente, sobre el paquete draft.
        { ...base, id: DRAFT_OFFER_ID, packageId: DRAFT_PKG_ID },
      ]);
    } catch (error) {
      // afterAll no corre si beforeAll falla: no dejar fixtures a medias en la DB.
      await cleanup();
      throw error;
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AC7: sin oferta devuelve el monto del precio del paquete sembrado", async () => {
    vi.stubEnv("PEN_PER_USD", "3.75");
    const totalCents = unitCents * 3;

    expect(await service.getBookingAmount({ packageId: PUBLISHED_ID, pax: 3 })).toEqual({
      offerId: null,
      unitPriceCents: unitCents,
      discountCents: 0,
      totalCents,
      exchangeRate: RATE,
      amountUsdCents: penToUsdCents(totalCents, RATE),
    });
  });

  it("AC7: con oferta válida sin vencimiento aplica el descuento y devuelve su id", async () => {
    vi.stubEnv("PEN_PER_USD", "3.75");
    const { discountCents, totalCents } = calculateOffer({
      unitCents,
      pax: 2,
      discountType: "percent",
      discountValue: 10,
      minPeople: null,
    });

    const result = await service.getBookingAmount({
      packageId: PUBLISHED_ID,
      pax: 2,
      offerId: VALID_ID,
    });

    expect(result).toEqual({
      offerId: VALID_ID,
      unitPriceCents: unitCents,
      discountCents,
      totalCents,
      exchangeRate: RATE,
      amountUsdCents: penToUsdCents(totalCents, RATE),
    });
    expect(result.discountCents).toBeGreaterThan(0);
  });

  it("AC7: offerId null equivale a sin oferta", async () => {
    vi.stubEnv("PEN_PER_USD", "3.75");
    const result = await service.getBookingAmount({
      packageId: PUBLISHED_ID,
      pax: 1,
      offerId: null,
    });
    expect(result.offerId).toBeNull();
    expect(result.totalCents).toBe(unitCents);
  });

  it("AC8: paquete inexistente lanza package_not_found", async () => {
    vi.stubEnv("PEN_PER_USD", "3.75");
    await expectCode(service.getBookingAmount({ packageId: MISSING_ID, pax: 1 }), "package_not_found");
  });

  it("AC8: paquete draft (con su oferta vigente) lanza package_not_found", async () => {
    vi.stubEnv("PEN_PER_USD", "3.75");
    await expectCode(service.getBookingAmount({ packageId: DRAFT_PKG_ID, pax: 1 }), "package_not_found");
    await expectCode(
      service.getBookingAmount({ packageId: DRAFT_PKG_ID, pax: 1, offerId: DRAFT_OFFER_ID }),
      "package_not_found",
    );
  });

  it.each([
    ["inexistente", () => MISSING_ID],
    ["vencida", () => EXPIRED_ID],
    ["inactiva", () => INACTIVE_ID],
    ["de otro paquete publicado", () => OTHER_PKG_ID],
    ["de un paquete no publicado", () => DRAFT_OFFER_ID],
  ])("AC9: oferta %s lanza offer_invalid", async (_label, getId) => {
    vi.stubEnv("PEN_PER_USD", "3.75");
    await expectCode(
      service.getBookingAmount({ packageId: PUBLISHED_ID, pax: 2, offerId: getId() }),
      "offer_invalid",
    );
  });

  it("AC9: la oferta válida de otro paquete publicado sí aplica en su propio paquete", async () => {
    vi.stubEnv("PEN_PER_USD", "3.75");
    const result = await service.getBookingAmount({
      packageId: OTHER_PUBLISHED_ID,
      pax: 2,
      offerId: OTHER_PKG_ID,
    });
    expect(result.offerId).toBe(OTHER_PKG_ID);
  });

  it.each([0, -1, 1.5, NaN])("AC10: pax %j lanza invalid_pax", async (pax) => {
    // PEN_PER_USD inválido y paquete inexistente: gana pax, que se valida primero.
    vi.stubEnv("PEN_PER_USD", "abc");
    await expectCode(service.getBookingAmount({ packageId: MISSING_ID, pax }), "invalid_pax");
  });

  it.each([undefined, "", "abc", "0", "3.75001"])(
    "AC10: PEN_PER_USD %j lanza invalid_exchange_rate",
    async (rate) => {
      vi.stubEnv("PEN_PER_USD", rate);
      // Paquete inexistente: el tipo de cambio se valida antes de consultar la DB.
      await expectCode(
        service.getBookingAmount({ packageId: MISSING_ID, pax: 1 }),
        "invalid_exchange_rate",
      );
    },
  );
});
