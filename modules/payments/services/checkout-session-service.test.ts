import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const expire = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create, expire } } }),
}));

import { createCheckoutSession, expireCheckoutSession } from "./checkout-session-service";

const input = {
  bookingId: "b1b1b1b1-0000-4000-8000-000000000001",
  bookingCode: "WY-4822",
  amountUsdCents: 68800,
  productName: "Machu Picchu Mágico · 2 viajeros",
  customerEmail: "ana@example.com",
  successUrl: "https://wayra.example/confirmacion/WY-4822",
  cancelUrl: "https://wayra.example/pago?salida=s1&viajeros=2",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  create.mockReset();
  expire.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createCheckoutSession", () => {
  it("AC15: llama a sessions.create una vez con los params y la idempotencyKey; devuelve { id, url }", async () => {
    create.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });

    const result = await createCheckoutSession(input);

    expect(result).toEqual({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    expect(create).toHaveBeenCalledTimes(1);
    const [params, options] = create.mock.calls[0];
    expect(params).toMatchObject({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      client_reference_id: input.bookingId,
      customer_email: input.customerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    });
    expect(params.line_items[0].price_data.unit_amount).toBe(68800);
    expect(options).toEqual({ idempotencyKey: `checkout-session:${input.bookingId}` });
  });

  it("AC15: lanza si Stripe devuelve url null", async () => {
    create.mockResolvedValue({ id: "cs_test_1", url: null });
    await expect(createCheckoutSession(input)).rejects.toThrow();
  });

  it("AC15: propaga el error de Stripe", async () => {
    create.mockRejectedValue(new Error("stripe down"));
    await expect(createCheckoutSession(input)).rejects.toThrow("stripe down");
  });
});

describe("expireCheckoutSession", () => {
  it("AC15: llama a sessions.expire con el id", async () => {
    expire.mockResolvedValue({});
    await expireCheckoutSession("cs_test_1");
    expect(expire).toHaveBeenCalledWith("cs_test_1");
  });

  it("AC15: no lanza si Stripe falla y no loguea datos personales", async () => {
    expire.mockRejectedValue(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(expireCheckoutSession("cs_test_1")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(spy.mock.calls)).not.toContain("@");
  });
});
