import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";

import { createCheckout } from "../services/checkout-service";
import type { CheckoutFormState } from "../types/checkout";
import { startCheckout } from "./start-checkout-action";

vi.mock("@/lib/auth/require-role", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
vi.mock("../services/checkout-service", () => ({ createCheckout: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const idle: CheckoutFormState = { status: "idle" };
const SALIDA = "11111111-1111-4111-8111-111111111111";
const OFERTA = "22222222-2222-4222-8222-222222222222";

const form = (over: Record<string, string> = {}, omit: string[] = []) => {
  const base: Record<string, string> = {
    salida: SALIDA,
    viajeros: "2",
    oferta: OFERTA,
    firstName: " Ana ",
    lastName: "Pérez",
    email: "Ana@Mail.com",
    phone: "+51 999 888 777",
    docType: "dni",
    docNumber: "12345678",
    terms: "on",
    ...over,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(base)) if (!omit.includes(k)) fd.set(k, v);
  return fd;
};

describe("startCheckout", () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockReset();
    vi.mocked(requireRole).mockResolvedValue({ userId: "user_1", role: "customer" });
    vi.mocked(createCheckout).mockReset();
    vi.mocked(createCheckout).mockResolvedValue({ ok: true, url: "https://stripe.test/s" });
  });

  it("AC21: AuthError devuelve unauthenticated sin llamar al servicio", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("UNAUTHENTICATED"));
    const state = await startCheckout(idle, form());
    expect(state).toMatchObject({ status: "error", code: "unauthenticated" });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("AC21: requireRole('customer') se llama antes de leer el form", async () => {
    const fd = form();
    const get = vi.spyOn(fd, "get");
    vi.mocked(requireRole).mockImplementation(async () => {
      expect(get).not.toHaveBeenCalled();
      return { userId: "user_1", role: "customer" };
    });
    await expect(startCheckout(idle, fd)).rejects.toThrow("NEXT_REDIRECT");
    expect(requireRole).toHaveBeenCalledWith("customer");
  });

  it("AC21: campos inválidos devuelven invalid_input con fieldErrors y values sin terms", async () => {
    const state = await startCheckout(idle, form({ email: "ana@" }, ["terms"]));
    expect(state).toMatchObject({
      status: "error",
      code: "invalid_input",
      fieldErrors: {
        email: "Ingresa un correo válido",
        terms: "Debes aceptar los términos y condiciones",
      },
      values: { firstName: " Ana ", email: "ana@", docType: "dni" },
    });
    expect(state.status === "error" && state.values).not.toHaveProperty("terms");
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it.each([
    ["salida", { salida: "x" }],
    ["viajeros", { viajeros: "0" }],
    ["oferta", { oferta: "x" }],
  ])("AC21: %s inválido devuelve invalid_link sin llamar al servicio", async (_n, over) => {
    const state = await startCheckout(idle, form(over));
    expect(state).toMatchObject({ status: "error", code: "invalid_link" });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("AC21: válido llama createCheckout una vez con el userId del token y hace redirect", async () => {
    await expect(startCheckout(idle, form())).rejects.toThrow(
      "NEXT_REDIRECT:https://stripe.test/s",
    );
    expect(createCheckout).toHaveBeenCalledTimes(1);
    expect(createCheckout).toHaveBeenCalledWith({
      clerkUserId: "user_1",
      data: expect.objectContaining({
        salida: SALIDA,
        viajeros: 2,
        oferta: OFERTA,
        firstName: "Ana",
        email: "ana@mail.com",
        docNumber: "12345678",
        terms: true,
      }),
    });
  });

  it("AC21: campos de precio en el FormData no llegan al servicio", async () => {
    const fd = form({ total: "1", price: "1", amountUsdCents: "1", userId: "evil" });
    await expect(startCheckout(idle, fd)).rejects.toThrow("NEXT_REDIRECT");
    const arg = vi.mocked(createCheckout).mock.calls[0][0];
    expect(arg.clerkUserId).toBe("user_1");
    expect(Object.keys(arg.data)).not.toEqual(
      expect.arrayContaining(["total", "price", "amountUsdCents", "userId"]),
    );
  });

  it("AC21: ok:false devuelve el mensaje del catálogo", async () => {
    vi.mocked(createCheckout).mockResolvedValue({ ok: false, code: "offer_invalid" });
    expect(await startCheckout(idle, form())).toEqual({
      status: "error",
      code: "offer_invalid",
      message: "La oferta ya no está vigente.",
    });
  });

  it("AC21: insufficient_seats incluye el número de cupos", async () => {
    vi.mocked(createCheckout).mockResolvedValue({
      ok: false,
      code: "insufficient_seats",
      seatsLeft: 3,
    });
    expect(await startCheckout(idle, form())).toMatchObject({
      code: "insufficient_seats",
      message: "Solo quedan 3 cupos.",
    });
  });

  it("AC21: excepción inesperada devuelve unexpected sin propagar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createCheckout).mockRejectedValue(new Error("boom"));
    expect(await startCheckout(idle, form())).toMatchObject({
      status: "error",
      code: "unexpected",
    });
  });

  it("AC21: FORBIDDEN también se corta sin llamar al servicio", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("FORBIDDEN"));
    const state = await startCheckout(idle, form());
    expect(state).toMatchObject({ status: "error" });
    expect(createCheckout).not.toHaveBeenCalled();
  });
});
