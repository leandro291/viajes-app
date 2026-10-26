import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingError } from "@/modules/bookings/types/booking";
import type { BookingAmount } from "@/modules/payments";
import { PaymentAmountError } from "@/modules/payments/utils/payment-error";

import type { CheckoutInput } from "../schemas/checkout-schema";

const m = vi.hoisted(() => ({
  getStripe: vi.fn(),
  getAppUrl: vi.fn(),
  getUserByClerkId: vi.fn(),
  getBookableDeparture: vi.fn(),
  getBookingAmount: vi.fn(),
  createPendingBooking: vi.fn(),
  cancelPendingBooking: vi.fn(),
  createCheckoutSession: vi.fn(),
  expireCheckoutSession: vi.fn(),
  createPendingPayment: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({ getStripe: m.getStripe }));
vi.mock("../utils/app-url", () => ({ getAppUrl: m.getAppUrl }));
vi.mock("@/modules/users", () => ({ getUserByClerkId: m.getUserByClerkId }));
vi.mock("@/modules/bookings", async () => ({
  BookingError: (await import("@/modules/bookings/types/booking")).BookingError,
  createPendingBooking: m.createPendingBooking,
  cancelPendingBooking: m.cancelPendingBooking,
}));
vi.mock("@/modules/packages", async () => ({
  buildCheckoutHref: (await import("@/modules/packages/utils/package-detail")).buildCheckoutHref,
  getBookableDeparture: m.getBookableDeparture,
}));
vi.mock("@/modules/payments", async () => ({
  PaymentAmountError: (await import("@/modules/payments/utils/payment-error")).PaymentAmountError,
  STRIPE_MIN_AMOUNT_USD_CENTS: 50,
  getBookingAmount: m.getBookingAmount,
  createCheckoutSession: m.createCheckoutSession,
  expireCheckoutSession: m.expireCheckoutSession,
  createPendingPayment: m.createPendingPayment,
}));

import { createCheckout, getCheckoutQuote } from "./checkout-service";

const DEP = "11111111-1111-4111-8111-111111111111";
const OFFER = "22222222-2222-4222-8222-222222222222";
const APP = "https://wayra.example";

const departure = {
  id: DEP,
  startsAt: new Date("2030-01-01T12:00:00Z"),
  seatsLeft: 5,
  package: {
    id: "pkg-1",
    slug: "machu-picchu-magico",
    title: "Machu Picchu Mágico",
    coverImageUrl: null,
    region: "Cusco",
    durationDays: 4,
    nights: 3,
  },
};

const amount = (over: Partial<BookingAmount> = {}): BookingAmount => ({
  offerId: null,
  unitPriceCents: 129000,
  discountCents: 0,
  totalCents: 258000,
  exchangeRate: 3.75,
  amountUsdCents: 68800,
  ...over,
});

const data: CheckoutInput = {
  salida: DEP,
  viajeros: 2,
  firstName: "Ana",
  lastName: "Pérez",
  email: "ana@example.com",
  phone: "+51987654321",
  docType: "dni",
  docNumber: "12345678",
  terms: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.getAppUrl.mockReturnValue(APP);
  m.getUserByClerkId.mockResolvedValue({ id: "user-1", email: "ana@example.com" });
  m.getBookableDeparture.mockResolvedValue(departure);
  m.getBookingAmount.mockResolvedValue(amount());
  m.createPendingBooking.mockResolvedValue({ id: "booking-1", code: "WY-4822" });
  m.createCheckoutSession.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/cs_1" });
  m.createPendingPayment.mockResolvedValue(undefined);
  m.cancelPendingBooking.mockResolvedValue(true);
  m.expireCheckoutSession.mockResolvedValue(undefined);
});

describe("getCheckoutQuote", () => {
  it("AC17: toma packageId de la salida y llama getBookingAmount solo con packageId, pax y offerId", async () => {
    const result = await getCheckoutQuote({ departureId: DEP, pax: 2, offerId: OFFER });

    expect(m.getBookingAmount).toHaveBeenCalledWith({ packageId: "pkg-1", pax: 2, offerId: OFFER });
    expect(result).toMatchObject({
      ok: true,
      quote: { pax: 2, offerExpired: false, belowMinimum: false, package: { id: "pkg-1" } },
    });
  });

  it("AC17: salida null -> departure_unavailable", async () => {
    m.getBookableDeparture.mockResolvedValue(null);
    expect(await getCheckoutQuote({ departureId: DEP, pax: 2 })).toEqual({
      ok: false,
      code: "departure_unavailable",
    });
  });

  it("AC17: sin cupo -> insufficient_seats con seatsLeft y packageSlug, sin calcular monto", async () => {
    expect(await getCheckoutQuote({ departureId: DEP, pax: 6 })).toEqual({
      ok: false,
      code: "insufficient_seats",
      seatsLeft: 5,
      packageSlug: "machu-picchu-magico",
    });
    expect(m.getBookingAmount).not.toHaveBeenCalled();
  });

  it("AC17: offer_invalid -> recalcula sin oferta y marca offerExpired", async () => {
    const noOffer = amount();
    m.getBookingAmount
      .mockRejectedValueOnce(new PaymentAmountError("offer_invalid"))
      .mockResolvedValueOnce(noOffer);

    const result = await getCheckoutQuote({ departureId: DEP, pax: 2, offerId: OFFER });

    expect(m.getBookingAmount).toHaveBeenNthCalledWith(2, { packageId: "pkg-1", pax: 2 });
    expect(result).toMatchObject({ ok: true, quote: { offerExpired: true, amount: noOffer } });
  });

  it.each([
    [49, true],
    [0, true],
    [50, false],
  ])("AC17: amountUsdCents %i -> belowMinimum %s", async (usd, below) => {
    m.getBookingAmount.mockResolvedValue(amount({ amountUsdCents: usd }));
    const result = await getCheckoutQuote({ departureId: DEP, pax: 2 });
    expect(result).toMatchObject({ ok: true, quote: { belowMinimum: below } });
  });

  it("AC17: invalid_exchange_rate -> payments_unavailable", async () => {
    m.getBookingAmount.mockRejectedValue(new PaymentAmountError("invalid_exchange_rate"));
    expect(await getCheckoutQuote({ departureId: DEP, pax: 2 })).toEqual({
      ok: false,
      code: "payments_unavailable",
    });
  });

  it("AC17: oferta válida que no rebaja (offerId nulo) no marca offerExpired", async () => {
    m.getBookingAmount.mockResolvedValue(amount({ offerId: null }));
    const result = await getCheckoutQuote({ departureId: DEP, pax: 1, offerId: OFFER });
    expect(result).toMatchObject({ ok: true, quote: { offerExpired: false } });
    expect(m.getBookingAmount).toHaveBeenCalledTimes(1);
  });
});

describe("createCheckout", () => {
  it("AC18: camino feliz con el orden y los datos del quote", async () => {
    const order: string[] = [];
    m.getStripe.mockImplementation(() => order.push("config"));
    m.getUserByClerkId.mockImplementation(async () => (order.push("user"), { id: "user-1", email: "x" }));
    m.getBookableDeparture.mockImplementation(async () => (order.push("quote"), departure));
    m.createPendingBooking.mockImplementation(
      async () => (order.push("booking"), { id: "booking-1", code: "WY-4822" }),
    );
    m.createCheckoutSession.mockImplementation(
      async () => (order.push("session"), { id: "cs_1", url: "https://checkout.stripe.com/cs_1" }),
    );
    m.createPendingPayment.mockImplementation(async () => void order.push("payment"));

    const result = await createCheckout({ clerkUserId: "clerk_1", data: { ...data, oferta: OFFER } });

    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.com/cs_1" });
    expect(order).toEqual(["config", "user", "quote", "booking", "session", "payment"]);
    expect(m.getUserByClerkId).toHaveBeenCalledWith("clerk_1");
    expect(m.createPendingBooking).toHaveBeenCalledWith({
      customerId: "user-1",
      departureId: DEP,
      paxCount: 2,
      amount: amount(),
      contact: { email: "ana@example.com", phone: "+51987654321" },
      traveler: { firstName: "Ana", lastName: "Pérez", docType: "dni", docNumber: "12345678" },
    });
    expect(m.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "booking-1",
        bookingCode: "WY-4822",
        amountUsdCents: 68800,
        customerEmail: "ana@example.com",
        successUrl: `${APP}/confirmacion?reserva=WY-4822`,
        cancelUrl: `${APP}/pago?salida=${DEP}&viajeros=2&oferta=${OFFER}`,
      }),
    );
    expect(m.createPendingPayment).toHaveBeenCalledWith({
      bookingId: "booking-1",
      amountUsdCents: 68800,
      stripeCheckoutSessionId: "cs_1",
    });
  });

  it("AC18: cancel_url sin oferta si no se pidió", async () => {
    await createCheckout({ clerkUserId: "clerk_1", data });
    expect(m.createCheckoutSession.mock.calls[0][0].cancelUrl).toBe(
      `${APP}/pago?salida=${DEP}&viajeros=2`,
    );
  });

  describe("AC19: sin efectos", () => {
    const noEffects = () => {
      expect(m.createPendingBooking).not.toHaveBeenCalled();
      expect(m.createCheckoutSession).not.toHaveBeenCalled();
      expect(m.createPendingPayment).not.toHaveBeenCalled();
    };

    it("getStripe lanza -> payments_unavailable", async () => {
      m.getStripe.mockImplementation(() => {
        throw new Error("falta STRIPE_SECRET_KEY");
      });
      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "payments_unavailable",
      });
      expect(m.getUserByClerkId).not.toHaveBeenCalled();
      noEffects();
    });

    it("getAppUrl lanza -> payments_unavailable", async () => {
      m.getAppUrl.mockImplementation(() => {
        throw new Error("falta NEXT_PUBLIC_APP_URL");
      });
      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "payments_unavailable",
      });
      noEffects();
    });

    it("usuario inexistente -> profile_missing", async () => {
      m.getUserByClerkId.mockResolvedValue(null);
      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "profile_missing",
      });
      noEffects();
    });

    it("salida no disponible -> departure_unavailable", async () => {
      m.getBookableDeparture.mockResolvedValue(null);
      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "departure_unavailable",
      });
      noEffects();
    });

    it("sin cupo -> insufficient_seats con seatsLeft", async () => {
      m.getBookableDeparture.mockResolvedValue({ ...departure, seatsLeft: 1 });
      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "insufficient_seats",
        seatsLeft: 1,
      });
      noEffects();
    });

    it("oferta vencida -> offer_invalid", async () => {
      m.getBookingAmount
        .mockRejectedValueOnce(new PaymentAmountError("offer_invalid"))
        .mockResolvedValueOnce(amount());
      expect(await createCheckout({ clerkUserId: "c", data: { ...data, oferta: OFFER } })).toEqual({
        ok: false,
        code: "offer_invalid",
      });
      noEffects();
    });

    it("total bajo el mínimo -> below_minimum", async () => {
      m.getBookingAmount.mockResolvedValue(amount({ amountUsdCents: 49 }));
      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "below_minimum",
      });
      noEffects();
    });

    it("BookingError de la carrera -> sus códigos, sin Session", async () => {
      m.createPendingBooking.mockRejectedValueOnce(new BookingError("departure_unavailable"));
      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "departure_unavailable",
      });
      m.createPendingBooking.mockRejectedValueOnce(new BookingError("insufficient_seats", 1));
      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "insufficient_seats",
        seatsLeft: 1,
      });
      expect(m.createCheckoutSession).not.toHaveBeenCalled();
      expect(m.createPendingPayment).not.toHaveBeenCalled();
    });
  });

  describe("AC20: compensación", () => {
    it("falla la Session -> cancela el booking una vez, sin payment", async () => {
      m.createCheckoutSession.mockRejectedValue(new Error("stripe down"));

      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "payments_unavailable",
      });
      expect(m.cancelPendingBooking).toHaveBeenCalledTimes(1);
      expect(m.cancelPendingBooking).toHaveBeenCalledWith("booking-1");
      expect(m.expireCheckoutSession).not.toHaveBeenCalled();
      expect(m.createPendingPayment).not.toHaveBeenCalled();
    });

    it("falla el payment -> expira la Session y cancela el booking", async () => {
      m.createPendingPayment.mockRejectedValue(new Error("db down"));

      expect(await createCheckout({ clerkUserId: "c", data })).toEqual({
        ok: false,
        code: "payments_unavailable",
      });
      expect(m.expireCheckoutSession).toHaveBeenCalledWith("cs_1");
      expect(m.cancelPendingBooking).toHaveBeenCalledWith("booking-1");
    });

    it("falla también la compensación -> no lanza y registra el código sin PII", async () => {
      m.createPendingPayment.mockRejectedValue(new Error("db down"));
      m.cancelPendingBooking.mockRejectedValue(new Error("db down"));
      const log = vi.spyOn(console, "error");

      await expect(createCheckout({ clerkUserId: "c", data })).resolves.toEqual({
        ok: false,
        code: "payments_unavailable",
      });
      const logged = JSON.stringify(log.mock.calls);
      expect(logged).toContain("WY-4822");
      for (const pii of [data.email, data.phone, data.docNumber]) {
        expect(logged).not.toContain(pii);
      }
    });
  });
});
