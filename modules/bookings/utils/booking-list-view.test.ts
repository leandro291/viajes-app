import { describe, expect, it } from "vitest";
import { docType, paymentStatus } from "@/lib/db/schema/enums";
import type { BookingTravelerDto } from "../types/booking-list";
import {
  BOOKING_STATUS_FILTERS,
  DOC_TYPE_LABELS,
  NO_PAYMENT_LABEL,
  PAYMENT_BADGE,
  toBookingRowDto,
  type BookingRow,
} from "./booking-list-view";

const row: BookingRow = {
  id: "b1",
  code: "WY-4822",
  packageTitle: "Machu Picchu",
  departureStartsAt: new Date("2026-11-05T12:30:00Z"),
  userFirstName: "Ana",
  userLastName: "Quispe",
  contactEmail: "ana@example.com",
  contactPhone: "+51 999 999 999",
  paxCount: 3,
  totalCents: 258000,
  status: "confirmed",
};

const traveler = (id: string, isPrimary: boolean): BookingTravelerDto => ({
  id,
  firstName: "N" + id,
  lastName: "A" + id,
  docType: "dni",
  docNumber: "12345678",
  isPrimary,
});

describe("toBookingRowDto", () => {
  it("AC4: customerName une nombre y apellido", () => {
    expect(toBookingRowDto(row, [], null).customerName).toBe("Ana Quispe");
  });

  it("AC4: customerName con solo uno de los dos, sin espacios sobrantes", () => {
    expect(toBookingRowDto({ ...row, userLastName: null }, [], null).customerName).toBe("Ana");
    expect(toBookingRowDto({ ...row, userFirstName: null }, [], null).customerName).toBe("Quispe");
    expect(toBookingRowDto({ ...row, userFirstName: "  Ana ", userLastName: " " }, [], null).customerName).toBe("Ana");
  });

  it("AC4: customerName null si ambos faltan o están vacíos", () => {
    expect(toBookingRowDto({ ...row, userFirstName: null, userLastName: null }, [], null).customerName).toBeNull();
    expect(toBookingRowDto({ ...row, userFirstName: "", userLastName: "  " }, [], null).customerName).toBeNull();
  });

  it("AC4: paymentStatus es el recibido o null sin pagos", () => {
    expect(toBookingRowDto(row, [], "succeeded").paymentStatus).toBe("succeeded");
    expect(toBookingRowDto(row, [], null).paymentStatus).toBeNull();
  });

  it("AC4: viajeros con el principal primero y el resto en su orden", () => {
    const dto = toBookingRowDto(row, [traveler("2", false), traveler("1", true), traveler("3", false)], null);
    expect(dto.travelers.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("AC4: copia docNumber completo y los campos de la reserva", () => {
    const dto = toBookingRowDto(row, [traveler("1", true)], null);
    expect(dto.travelers[0].docNumber).toBe("12345678");
    expect(dto).toMatchObject({
      id: "b1",
      code: "WY-4822",
      packageTitle: "Machu Picchu",
      contactEmail: "ana@example.com",
      contactPhone: "+51 999 999 999",
      paxCount: 3,
      totalCents: 258000,
      status: "confirmed",
    });
    expect(dto.departureStartsAt).toEqual(row.departureStartsAt);
  });
});

describe("mapas de etiquetas", () => {
  it("AC5: DOC_TYPE_LABELS cubre todo el enum y usa las etiquetas acordadas", () => {
    expect(Object.keys(DOC_TYPE_LABELS).sort()).toEqual([...docType.enumValues].sort());
    expect(DOC_TYPE_LABELS).toEqual({
      dni: "DNI",
      passport: "Pasaporte",
      foreign_id: "Carné de extranjería",
    });
  });

  it("AC5: PAYMENT_BADGE cubre todo el enum y usa badge + etiqueta acordados", () => {
    expect(Object.keys(PAYMENT_BADGE).sort()).toEqual([...paymentStatus.enumValues].sort());
    expect(PAYMENT_BADGE).toEqual({
      succeeded: { badge: "confirmed", label: "Pagado" },
      pending: { badge: "pending", label: "Pendiente" },
      failed: { badge: "cancelled", label: "Fallido" },
      refunded: { badge: "neutral", label: "Reembolsado" },
      partially_refunded: { badge: "neutral", label: "Reembolso parcial" },
    });
  });

  it("AC5: sin pago muestra 'Sin pago'", () => {
    expect(NO_PAYMENT_LABEL).toBe("Sin pago");
  });

  it("AC5: BOOKING_STATUS_FILTERS ofrece Todas + un filtro por estado de reserva", () => {
    expect(BOOKING_STATUS_FILTERS.map((f) => [f.value, f.label])).toEqual([
      [undefined, "Todas"],
      ["pending", "Pendientes"],
      ["confirmed", "Confirmadas"],
      ["cancelled", "Canceladas"],
    ]);
  });
});
