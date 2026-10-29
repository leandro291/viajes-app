import { beforeEach, describe, expect, it, vi } from "vitest";

const refundsCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ refunds: { create: refundsCreate } }) }));

import { refundPaymentIntent } from "./refund-service";

describe("refundPaymentIntent", () => {
  beforeEach(() => {
    refundsCreate.mockReset();
  });

  it("AC3: llama refunds.create sin amount con la idempotencyKey y devuelve alreadyRefunded false", async () => {
    refundsCreate.mockResolvedValue({ id: "re_1" });

    await expect(refundPaymentIntent("pi_x", "refund-cancel:p1")).resolves.toEqual({
      alreadyRefunded: false,
    });
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect(refundsCreate).toHaveBeenCalledWith(
      { payment_intent: "pi_x" },
      { idempotencyKey: "refund-cancel:p1" },
    );
  });

  it("AC3: charge_already_refunded se trata como éxito con alreadyRefunded true", async () => {
    refundsCreate.mockRejectedValue(Object.assign(new Error("already"), { code: "charge_already_refunded" }));

    await expect(refundPaymentIntent("pi_x", "k")).resolves.toEqual({ alreadyRefunded: true });
  });

  it("AC3: cualquier otro error se relanza", async () => {
    const boom = Object.assign(new Error("boom"), { code: "api_connection_error" });
    refundsCreate.mockRejectedValue(boom);

    await expect(refundPaymentIntent("pi_x", "k")).rejects.toBe(boom);
  });
});
