import { describe, expect, it } from "vitest";
import {
  CHECKOUT_SESSION_TTL_SECONDS,
  buildCheckoutSessionParams,
} from "./checkout-session";

const input = {
  bookingId: "b1b1b1b1-0000-4000-8000-000000000001",
  bookingCode: "WY-4822",
  amountUsdCents: 68800,
  productName: "Machu Picchu Mágico · 2 viajeros",
  customerEmail: "ana@example.com",
  successUrl: "https://wayra.example/confirmacion?reserva=WY-4822",
  cancelUrl: "https://wayra.example/pago?salida=s1&viajeros=2",
  nowSeconds: 1_700_000_000,
};

describe("buildCheckoutSessionParams", () => {
  it("AC14: modo pago, solo tarjeta (allowed_payment_method_types), un line item en USD", () => {
    const p = buildCheckoutSessionParams(input);
    expect(p.mode).toBe("payment");
    expect(p.allowed_payment_method_types).toEqual(["card"]);
    expect(p.line_items).toEqual([
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 68800,
          product_data: { name: "Machu Picchu Mágico · 2 viajeros" },
        },
      },
    ]);
    expect(Number.isInteger(p.line_items![0].price_data!.unit_amount)).toBe(true);
  });

  it("AC14: incluye descripción solo si se pasa", () => {
    const p = buildCheckoutSessionParams({
      ...input,
      productDescription: "Cusco · 4 días",
    });
    expect(p.line_items![0].price_data!.product_data).toEqual({
      name: input.productName,
      description: "Cusco · 4 días",
    });
  });

  it("AC14: correo, referencia, metadata, urls y locale", () => {
    const p = buildCheckoutSessionParams(input);
    expect(p.customer_email).toBe("ana@example.com");
    expect(p.client_reference_id).toBe(input.bookingId);
    expect(p.metadata).toEqual({
      booking_id: input.bookingId,
      booking_code: "WY-4822",
    });
    expect(p.success_url).toBe(input.successUrl);
    expect(p.cancel_url).toBe(input.cancelUrl);
    expect(p.locale).toBe("es");
  });

  it("AC14: expires_at = nowSeconds + 31 min", () => {
    expect(CHECKOUT_SESSION_TTL_SECONDS).toBe(31 * 60);
    expect(buildCheckoutSessionParams(input).expires_at).toBe(
      1_700_000_000 + 31 * 60,
    );
  });
});
