import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StripeEvent } from "@/lib/stripe";

const repo = vi.hoisted(() => ({
  claimEvent: vi.fn(),
  lockBooking: vi.fn(),
  findPaymentBySession: vi.fn(),
  findPaymentByIntent: vi.fn(),
  reserveSeats: vi.fn(),
  confirmBooking: vi.fn(),
  cancelBooking: vi.fn(),
  markPaymentSucceeded: vi.fn(),
  markPaymentRefundedInFull: vi.fn(),
  markPaymentFailed: vi.fn(),
  setPaymentRefunded: vi.fn(),
}));
const refundsCreate = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
const tx = {};

vi.mock("@/lib/db", () => ({ db: { transaction } }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ refunds: { create: refundsCreate } }) }));
vi.mock("./stripe-webhook-repository", () => repo);

import { handleStripeEvent } from "./stripe-webhook-service";

const BOOKING = { id: "b1", status: "pending", departureId: "d1", paxCount: 2 };
const PAYMENT = { id: "p1", bookingId: "b1", status: "pending", amountCents: 10000, refundedCents: 0 };

const sessionEvent = (type: string, over: Record<string, unknown> = {}) =>
  ({
    id: "evt_1",
    type,
    data: {
      object: {
        id: "cs_1",
        payment_status: "paid",
        payment_intent: "pi_1",
        metadata: { booking_id: "b1" },
        client_reference_id: "b1",
        ...over,
      },
    },
  }) as unknown as StripeEvent;

const chargeEvent = (over: Record<string, unknown> = {}) =>
  ({
    id: "evt_2",
    type: "charge.refunded",
    data: { object: { id: "ch_1", payment_intent: "pi_1", amount_refunded: 10000, ...over } },
  }) as unknown as StripeEvent;

const completed = (over?: Record<string, unknown>) => sessionEvent("checkout.session.completed", over);
const expired = (over?: Record<string, unknown>) => sessionEvent("checkout.session.expired", over);

// Solo claimEvent se toca cuando no hay nada más que hacer.
const onlyClaimed = () => {
  for (const [name, fn] of Object.entries(repo)) {
    if (name !== "claimEvent") expect(fn, name).not.toHaveBeenCalled();
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  transaction.mockImplementation((fn) => fn(tx));
  repo.claimEvent.mockResolvedValue(true);
  repo.lockBooking.mockResolvedValue({ ...BOOKING });
  repo.findPaymentBySession.mockResolvedValue({ ...PAYMENT });
  repo.findPaymentByIntent.mockResolvedValue({ ...PAYMENT });
  repo.reserveSeats.mockResolvedValue(true);
  refundsCreate.mockResolvedValue({});
});

describe("idempotencia y tipos ignorados", () => {
  it("AC5: abre una transacción y reclama el evento primero", async () => {
    await handleStripeEvent(completed({ payment_status: "unpaid" }));
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repo.claimEvent).toHaveBeenCalledWith(tx, "evt_1", "checkout.session.completed");
  });

  it("AC5: evento ya procesado es no-op, sin otras consultas ni Stripe", async () => {
    repo.claimEvent.mockResolvedValue(false);
    await expect(handleStripeEvent(completed())).resolves.toBeUndefined();
    onlyClaimed();
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("AC5: mismo evento dos veces: la segunda es no-op", async () => {
    repo.claimEvent.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await handleStripeEvent(completed());
    repo.confirmBooking.mockClear();
    await handleStripeEvent(completed());
    expect(repo.confirmBooking).not.toHaveBeenCalled();
  });

  it("AC6: tipo no manejado no abre transacción", async () => {
    await handleStripeEvent({ id: "evt_x", type: "payment_intent.created", data: { object: {} } } as unknown as StripeEvent);
    expect(transaction).not.toHaveBeenCalled();
    expect(repo.claimEvent).not.toHaveBeenCalled();
  });

  it("AC7: si el reembolso lanza, propaga el error", async () => {
    repo.reserveSeats.mockResolvedValue(false);
    refundsCreate.mockRejectedValue(new Error("stripe down"));
    await expect(handleStripeEvent(completed())).rejects.toThrow("stripe down");
  });
});

describe("checkout.session.completed", () => {
  it("AC8: con cupo confirma booking y marca el payment succeeded", async () => {
    await handleStripeEvent(completed());
    expect(repo.lockBooking).toHaveBeenCalledWith(tx, "b1");
    expect(repo.reserveSeats).toHaveBeenCalledWith(tx, "d1", 2);
    expect(repo.markPaymentSucceeded).toHaveBeenCalledWith(tx, "p1", "pi_1");
    expect(repo.confirmBooking).toHaveBeenCalledWith(tx, "b1");
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("AC8: payment_intent como objeto expandido", async () => {
    await handleStripeEvent(completed({ payment_intent: { id: "pi_obj" } }));
    expect(repo.markPaymentSucceeded).toHaveBeenCalledWith(tx, "p1", "pi_obj");
  });

  it("AC8: usa client_reference_id si falta metadata.booking_id", async () => {
    await handleStripeEvent(completed({ metadata: {}, client_reference_id: "b9" }));
    expect(repo.lockBooking).toHaveBeenCalledWith(tx, "b9");
  });

  it("AC9: sin cupo reembolsa en total, cancela el booking y pide el reembolso una vez", async () => {
    repo.reserveSeats.mockResolvedValue(false);
    await handleStripeEvent(completed());
    expect(repo.markPaymentRefundedInFull).toHaveBeenCalledWith(tx, "p1", "pi_1");
    expect(repo.cancelBooking).toHaveBeenCalledWith(tx, "b1");
    expect(repo.confirmBooking).not.toHaveBeenCalled();
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect(refundsCreate).toHaveBeenCalledWith(
      { payment_intent: "pi_1" },
      { idempotencyKey: "refund-no-seat:p1" },
    );
  });

  it("AC10: booking cancelado reembolsa sin llamar a reserveSeats", async () => {
    repo.lockBooking.mockResolvedValue({ ...BOOKING, status: "cancelled" });
    await handleStripeEvent(completed());
    expect(repo.reserveSeats).not.toHaveBeenCalled();
    expect(repo.markPaymentRefundedInFull).toHaveBeenCalledWith(tx, "p1", "pi_1");
    expect(repo.cancelBooking).not.toHaveBeenCalled();
    expect(refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("AC10: booking confirmed no cambia nada ni reembolsa", async () => {
    repo.lockBooking.mockResolvedValue({ ...BOOKING, status: "confirmed" });
    await handleStripeEvent(completed());
    expect(repo.reserveSeats).not.toHaveBeenCalled();
    expect(repo.markPaymentSucceeded).not.toHaveBeenCalled();
    expect(repo.markPaymentRefundedInFull).not.toHaveBeenCalled();
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it.each(["succeeded", "refunded", "partially_refunded"])(
    "AC10: payment ya %s no cambia nada ni reembolsa",
    async (status) => {
      repo.findPaymentBySession.mockResolvedValue({ ...PAYMENT, status });
      await handleStripeEvent(completed());
      expect(repo.reserveSeats).not.toHaveBeenCalled();
      expect(repo.confirmBooking).not.toHaveBeenCalled();
      expect(refundsCreate).not.toHaveBeenCalled();
    },
  );

  it.each(["unpaid", "no_payment_required"])("AC11: payment_status %s solo registra el evento", async (s) => {
    await handleStripeEvent(completed({ payment_status: s }));
    onlyClaimed();
  });

  it("AC11: sin booking_id ni client_reference_id registra, loguea y no escribe", async () => {
    await handleStripeEvent(completed({ metadata: {}, client_reference_id: null }));
    onlyClaimed();
    expect(console.error).toHaveBeenCalled();
  });

  it("AC11: payment inexistente lanza", async () => {
    repo.findPaymentBySession.mockResolvedValue(undefined);
    await expect(handleStripeEvent(completed())).rejects.toThrow("sin payment");
  });

  it("AC11: payment_intent nulo al reembolsar lanza", async () => {
    repo.reserveSeats.mockResolvedValue(false);
    await expect(handleStripeEvent(completed({ payment_intent: null }))).rejects.toThrow("payment_intent");
    expect(refundsCreate).not.toHaveBeenCalled();
  });
});

describe("checkout.session.expired", () => {
  it("AC12: booking pending se cancela y el payment pending pasa a failed", async () => {
    await handleStripeEvent(expired());
    expect(repo.cancelBooking).toHaveBeenCalledWith(tx, "b1");
    expect(repo.markPaymentFailed).toHaveBeenCalledWith(tx, "p1");
    expect(repo.reserveSeats).not.toHaveBeenCalled();
  });

  it.each(["confirmed", "cancelled"])("AC12: booking %s no escribe", async (status) => {
    repo.lockBooking.mockResolvedValue({ ...BOOKING, status });
    await handleStripeEvent(expired());
    expect(repo.cancelBooking).not.toHaveBeenCalled();
    expect(repo.markPaymentFailed).not.toHaveBeenCalled();
    expect(repo.reserveSeats).not.toHaveBeenCalled();
  });

  it("AC12: sin payment igual cancela el booking pending", async () => {
    repo.findPaymentBySession.mockResolvedValue(undefined);
    await handleStripeEvent(expired());
    expect(repo.cancelBooking).toHaveBeenCalledWith(tx, "b1");
    expect(repo.markPaymentFailed).not.toHaveBeenCalled();
  });
});

describe("charge.refunded", () => {
  it("AC13: reembolso total", async () => {
    await handleStripeEvent(chargeEvent());
    expect(repo.findPaymentByIntent).toHaveBeenCalledWith(tx, "pi_1");
    expect(repo.setPaymentRefunded).toHaveBeenCalledWith(tx, "p1", 10000, "refunded");
  });

  it("AC13: reembolso parcial", async () => {
    await handleStripeEvent(chargeEvent({ amount_refunded: 3000 }));
    expect(repo.setPaymentRefunded).toHaveBeenCalledWith(tx, "p1", 3000, "partially_refunded");
  });

  it("AC13: amount_refunded 0 no cambia nada", async () => {
    await handleStripeEvent(chargeEvent({ amount_refunded: 0 }));
    expect(repo.setPaymentRefunded).not.toHaveBeenCalled();
  });

  it("AC13: evento viejo con menos reembolsado no retrocede", async () => {
    repo.findPaymentByIntent.mockResolvedValue({ ...PAYMENT, status: "partially_refunded", refundedCents: 5000 });
    await handleStripeEvent(chargeEvent({ amount_refunded: 3000 }));
    expect(repo.setPaymentRefunded).not.toHaveBeenCalled();
  });

  it("AC13: amount_refunded mayor al monto se acota", async () => {
    await handleStripeEvent(chargeEvent({ amount_refunded: 99999 }));
    expect(repo.setPaymentRefunded).toHaveBeenCalledWith(tx, "p1", 10000, "refunded");
  });

  it("AC14: payment_intent objeto expandido; no toca bookings ni departures", async () => {
    await handleStripeEvent(chargeEvent({ payment_intent: { id: "pi_obj" } }));
    expect(repo.findPaymentByIntent).toHaveBeenCalledWith(tx, "pi_obj");
    expect(repo.lockBooking).not.toHaveBeenCalled();
    expect(repo.cancelBooking).not.toHaveBeenCalled();
    expect(repo.reserveSeats).not.toHaveBeenCalled();
  });

  it("AC14: sin payment para el payment_intent lanza", async () => {
    repo.findPaymentByIntent.mockResolvedValue(undefined);
    await expect(handleStripeEvent(chargeEvent())).rejects.toThrow("sin payment");
  });

  it("AC15: tras el reembolso total de D2, charge.refunded no cambia el payment", async () => {
    repo.reserveSeats.mockResolvedValue(false);
    await handleStripeEvent(completed());
    repo.findPaymentByIntent.mockResolvedValue({ ...PAYMENT, status: "refunded", refundedCents: 10000 });
    await handleStripeEvent(chargeEvent());
    expect(repo.setPaymentRefunded).not.toHaveBeenCalled();
  });
});
