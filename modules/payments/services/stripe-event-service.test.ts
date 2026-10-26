import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const getStripe = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => getStripe(),
}));

import { parseStripeEvent, StripeSignatureError } from "./stripe-event-service";

const SECRET = "whsec_test_secret";
const RAW = '{"id":"evt_1",  "type":"checkout.session.completed"}';

beforeEach(() => {
  constructEvent.mockReset();
  getStripe.mockReset();
  getStripe.mockReturnValue({ webhooks: { constructEvent } });
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseStripeEvent", () => {
  it("AC2: pasa el cuerpo crudo tal cual, la firma y el secreto a constructEvent y devuelve el evento", () => {
    const event = { id: "evt_1", type: "checkout.session.completed" };
    constructEvent.mockReturnValue(event);

    expect(parseStripeEvent(RAW, "t=1,v1=abc")).toBe(event);
    expect(constructEvent).toHaveBeenCalledExactlyOnceWith(RAW, "t=1,v1=abc", SECRET);
  });

  it.each([null, ""])("AC2: firma %j -> StripeSignatureError sin llamar a constructEvent", (sig) => {
    expect(() => parseStripeEvent(RAW, sig)).toThrow(StripeSignatureError);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("AC2: constructEvent lanzando -> StripeSignatureError", () => {
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    expect(() => parseStripeEvent(RAW, "t=1,v1=bad")).toThrow(StripeSignatureError);
  });

  it.each([undefined, "", "   "])("AC2: STRIPE_WEBHOOK_SECRET %j -> Error plano con el nombre de la variable", (value) => {
    if (value === undefined) vi.stubEnv("STRIPE_WEBHOOK_SECRET", undefined);
    else vi.stubEnv("STRIPE_WEBHOOK_SECRET", value);

    let error: unknown;
    try {
      parseStripeEvent(RAW, "t=1,v1=abc");
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(StripeSignatureError);
    expect((error as Error).message).toContain("STRIPE_WEBHOOK_SECRET");
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("AC2: getStripe lanzando -> Error plano (no StripeSignatureError), sin filtrar el secreto", () => {
    getStripe.mockImplementation(() => {
      throw new Error("Falta la variable de entorno STRIPE_SECRET_KEY.");
    });

    let error: unknown;
    try {
      parseStripeEvent(RAW, "t=1,v1=abc");
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(StripeSignatureError);
    expect((error as Error).message).not.toContain(SECRET);
  });
});
