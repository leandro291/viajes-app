import { beforeEach, describe, expect, it, vi } from "vitest";

const { parseStripeEvent, handleStripeEvent, StripeSignatureError } = vi.hoisted(() => ({
  parseStripeEvent: vi.fn(),
  handleStripeEvent: vi.fn(),
  StripeSignatureError: class StripeSignatureError extends Error {},
}));

vi.mock("@/modules/payments", () => ({ parseStripeEvent, handleStripeEvent, StripeSignatureError }));

import type { NextRequest } from "next/server";

import { POST } from "./route";

const event = { id: "evt_1", type: "checkout.session.completed" };

const call = (signature?: string) =>
  POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: '{"raw":true}',
      headers: signature ? { "stripe-signature": signature } : {},
    }) as NextRequest,
  );

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    parseStripeEvent.mockReturnValue(event);
    handleStripeEvent.mockResolvedValue(undefined);
  });

  it("AC3: pasa cuerpo crudo y header stripe-signature a parseStripeEvent", async () => {
    const res = await call("t=1,v1=abc");
    expect(parseStripeEvent).toHaveBeenCalledWith('{"raw":true}', "t=1,v1=abc");
    expect(handleStripeEvent).toHaveBeenCalledWith(event);
    expect(res.status).toBe(200);
  });

  it("AC3: StripeSignatureError -> 400 sin llamar a handleStripeEvent", async () => {
    parseStripeEvent.mockImplementation(() => {
      throw new StripeSignatureError();
    });
    const res = await call();
    expect(res.status).toBe(400);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("AC3: otro error al verificar (config) -> 500 sin llamar a handleStripeEvent", async () => {
    parseStripeEvent.mockImplementation(() => {
      throw new Error("Falta STRIPE_WEBHOOK_SECRET");
    });
    const res = await call("sig");
    expect(res.status).toBe(500);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("AC3: handleStripeEvent lanza -> 500 y loguea event.id", async () => {
    handleStripeEvent.mockRejectedValue(new Error("boom"));
    const res = await call("sig");
    expect(res.status).toBe(500);
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).toContain("evt_1");
  });
});
