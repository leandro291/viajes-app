import { describe, expect, it } from "vitest";

import { toCustomerRowDto, type CustomerRow } from "./customer-row";

const row: CustomerRow = {
  id: "u1",
  firstName: "Ana",
  lastName: "Quispe",
  email: "ana@example.com",
  bookingsCount: 2,
  totalCents: 258000,
  lastBookingAt: new Date("2026-10-01T12:00:00Z"),
};

describe("toCustomerRowDto", () => {
  it("une nombre y apellido", () => {
    expect(toCustomerRowDto(row).name).toBe("Ana Quispe");
  });
  it("ignora partes vacías o con espacios", () => {
    expect(toCustomerRowDto({ ...row, lastName: "  " }).name).toBe("Ana");
  });
  it("sin nombre ni apellido -> null", () => {
    expect(toCustomerRowDto({ ...row, firstName: null, lastName: null }).name).toBeNull();
  });
  it("cliente sin reservas confirmadas conserva ceros y fecha null", () => {
    const dto = toCustomerRowDto({ ...row, bookingsCount: 0, totalCents: 0, lastBookingAt: null });
    expect(dto).toMatchObject({ bookingsCount: 0, totalCents: 0, lastBookingAt: null });
  });
});
