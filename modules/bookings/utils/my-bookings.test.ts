import { describe, expect, it } from "vitest";

import type { MyBookingRow } from "../types/my-bookings";
import { partitionMyBookings, toMyBookingDto } from "./my-bookings";

const HOUR = 3600 * 1000;
const NOW = new Date("2026-10-28T12:00:00.000Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);

const row = (over: Partial<MyBookingRow> = {}): MyBookingRow => ({
  id: "b1",
  code: "WY-0001",
  status: "confirmed",
  paxCount: 2,
  totalCents: 200000,
  startsAt: at(72 * HOUR),
  departureStatus: "scheduled",
  slug: "valle-sagrado",
  title: "Valle Sagrado",
  coverImageUrl: null,
  destinationName: "Cusco",
  ...over,
});

const dto = (over: Partial<MyBookingRow> = {}) => toMyBookingDto(row(over), null, NOW);

describe("toMyBookingDto", () => {
  it("AC5: conserva los campos del contrato y anida el paquete", () => {
    expect(toMyBookingDto(row(), { status: "succeeded", amountCents: 53333 }, NOW)).toEqual({
      id: "b1",
      code: "WY-0001",
      status: "confirmed",
      paxCount: 2,
      totalCents: 200000,
      startsAt: at(72 * HOUR),
      departureStatus: "scheduled",
      package: { slug: "valle-sagrado", title: "Valle Sagrado", coverImageUrl: null, destinationName: "Cusco" },
      paymentStatus: "succeeded",
      refundableUsdCents: 53333,
      freeCancelUntil: at(24 * HOUR),
      canCancel: true,
    });
  });

  it("AC5: no filtra customerId, contacto ni documentos aunque la fila los traiga", () => {
    const leaky = {
      ...row(),
      customerId: "c1",
      contactEmail: "a@b.com",
      contactPhone: "+51999",
      docNumber: "12345678",
    } as MyBookingRow;
    const json = JSON.stringify(toMyBookingDto(leaky, null, NOW));
    for (const s of ["customerId", "contactEmail", "contactPhone", "docNumber", "12345678", "a@b.com"]) {
      expect(json).not.toContain(s);
    }
  });

  it("AC5: refundableUsdCents solo si el último pago es succeeded", () => {
    const statuses = ["pending", "failed", "refunded", "partially_refunded"] as const;
    for (const status of statuses) {
      const d = toMyBookingDto(row(), { status, amountCents: 100 }, NOW);
      expect(d.refundableUsdCents).toBeNull();
      expect(d.paymentStatus).toBe(status);
    }
    const none = dto();
    expect(none.paymentStatus).toBeNull();
    expect(none.refundableUsdCents).toBeNull();
  });

  it("AC5: canCancel sigue a cancelBlock (48 h exactas sí, -1 ms no, no confirmed no)", () => {
    expect(dto({ startsAt: at(48 * HOUR) }).canCancel).toBe(true);
    expect(dto({ startsAt: at(48 * HOUR - 1) }).canCancel).toBe(false);
    expect(dto({ status: "pending" }).canCancel).toBe(false);
    expect(dto({ status: "cancelled" }).canCancel).toBe(false);
    expect(dto({ departureStatus: "completed" }).canCancel).toBe(false);
  });

  it("AC5: freeCancelUntil = startsAt - 48 h", () => {
    expect(dto({ startsAt: at(100 * HOUR) }).freeCancelUntil).toEqual(at(52 * HOUR));
  });
});

describe("partitionMyBookings", () => {
  const b = (id: string, ms: number, status: MyBookingRow["status"] = "confirmed") =>
    dto({ id, startsAt: at(ms), status });

  it("AC5: próximas ascendentes, resto descendente", () => {
    const list = [
      b("up2", 5 * HOUR),
      b("past1", -2 * HOUR),
      b("up1", 1 * HOUR),
      b("past2", -9 * HOUR),
      b("cancelledFuture", 3 * HOUR, "cancelled"),
      b("pendingFuture", 2 * HOUR, "pending"),
    ];
    const { upcoming, past } = partitionMyBookings(list, NOW);
    expect(upcoming.map((x) => x.id)).toEqual(["up1", "pendingFuture", "up2"]);
    expect(past.map((x) => x.id)).toEqual(["cancelledFuture", "past1", "past2"]);
  });

  it("AC5: frontera now (D9): startsAt === now es próxima; +1 ms próxima; -1 ms anterior", () => {
    const { upcoming, past } = partitionMyBookings(
      [b("minus", -1), b("exact", 0), b("plus", 1)],
      NOW,
    );
    expect(upcoming.map((x) => x.id)).toEqual(["exact", "plus"]);
    expect(past.map((x) => x.id)).toEqual(["minus"]);
  });

  it("AC5: una cancelada con startsAt === now va a anteriores", () => {
    const { upcoming, past } = partitionMyBookings([b("c", 0, "cancelled")], NOW);
    expect(upcoming).toEqual([]);
    expect(past.map((x) => x.id)).toEqual(["c"]);
  });

  it("AC5: lista vacía y no muta la entrada", () => {
    expect(partitionMyBookings([], NOW)).toEqual({ upcoming: [], past: [] });
    const list = [b("a", 5 * HOUR), b("b", 1 * HOUR)];
    partitionMyBookings(list, NOW);
    expect(list.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
