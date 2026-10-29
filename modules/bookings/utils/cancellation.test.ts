import { describe, expect, it } from "vitest";
import type { CancelErrorCode } from "../types/cancellation";
import {
  adminCancelBlock,
  adminCancelErrorMessage,
  cancelBlock,
  cancelErrorMessage,
  freeCancelDeadline,
} from "./cancellation";

const HOUR = 60 * 60 * 1000;
const startsAt = new Date("2026-11-05T12:30:00Z");
const base = { status: "confirmed", departureStatus: "scheduled", startsAt } as const;
const at = (msBefore: number) => new Date(startsAt.getTime() - msBefore);

describe("cancelBlock", () => {
  it("AC2: 48 h exactas -> null (ventana inclusiva)", () => {
    expect(cancelBlock(base, at(48 * HOUR))).toBeNull();
  });

  it("AC2: 48 h - 1 ms -> too_late", () => {
    expect(cancelBlock(base, at(48 * HOUR - 1))).toBe("too_late");
  });

  it("AC2: 49 h -> null", () => {
    expect(cancelBlock(base, at(49 * HOUR))).toBeNull();
  });

  it("AC2: salida pasada -> too_late", () => {
    expect(cancelBlock(base, new Date(startsAt.getTime() + HOUR))).toBe("too_late");
  });

  it("AC2: status pending o cancelled -> not_cancellable", () => {
    expect(cancelBlock({ ...base, status: "pending" }, at(72 * HOUR))).toBe("not_cancellable");
    expect(cancelBlock({ ...base, status: "cancelled" }, at(72 * HOUR))).toBe("not_cancellable");
  });

  it("AC2: salida en_route, completed o cancelled -> not_cancellable", () => {
    for (const departureStatus of ["en_route", "completed", "cancelled"] as const) {
      expect(cancelBlock({ ...base, departureStatus }, at(72 * HOUR))).toBe("not_cancellable");
    }
  });
});

describe("freeCancelDeadline", () => {
  it("AC2: = startsAt - 48 h", () => {
    expect(freeCancelDeadline(startsAt).toISOString()).toBe("2026-11-03T12:30:00.000Z");
  });
});

describe("cancelErrorMessage", () => {
  it("AC4: copy D14 para cada CancelErrorCode, sin undefined", () => {
    const expected: Record<CancelErrorCode, string> = {
      not_found: "No encontramos esta reserva.",
      not_cancellable: "Esta reserva no se puede cancelar.",
      too_late: "Ya no se puede cancelar gratis esta reserva.",
      no_refundable_payment: "No pudimos encontrar el pago para reembolsarlo. Escríbenos y lo resolvemos.",
      refund_failed: "No pudimos procesar el reembolso. No se canceló nada; intenta de nuevo en unos minutos.",
    };
    for (const [code, msg] of Object.entries(expected)) {
      expect(cancelErrorMessage(code as CancelErrorCode)).toBe(msg);
    }
  });
});

describe("adminCancelBlock", () => {
  const statuses = ["pending", "confirmed", "cancelled"] as const;
  const departures = ["scheduled", "en_route", "completed", "cancelled"] as const;
  const cancellable = new Set(["pending", "confirmed/scheduled", "confirmed/cancelled"]);
  const key = (s: string, d: string) => (s === "pending" ? "pending" : `${s}/${d}`);

  it("AC1: tabla status x departureStatus", () => {
    for (const status of statuses) {
      for (const departureStatus of departures) {
        const expected = cancellable.has(key(status, departureStatus)) ? null : "not_cancellable";
        expect(adminCancelBlock({ status, departureStatus }), `${status}/${departureStatus}`).toBe(expected);
      }
    }
  });
});

describe("adminCancelErrorMessage", () => {
  it("AC2: copy admin para cada código, sin tuteo al cliente ni 'gratis'", () => {
    const expected = {
      not_found: "No encontramos esta reserva.",
      not_cancellable: "Esta reserva no se puede cancelar (la salida ya está en curso o finalizó).",
      no_refundable_payment: "La reserva no tiene un pago de Stripe que reembolsar. Revísala en el panel de Stripe.",
      refund_failed: "Stripe no pudo procesar el reembolso. No se canceló nada; intenta de nuevo en unos minutos.",
    } as const;
    for (const [code, msg] of Object.entries(expected)) {
      const out = adminCancelErrorMessage(code as keyof typeof expected);
      expect(out).toBe(msg);
      expect(out).not.toMatch(/gratis|Escríbenos/i);
    }
  });
});
