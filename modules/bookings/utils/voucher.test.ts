import { describe, expect, it } from "vitest";
import { isBookingCode, toVoucherDto, type VoucherRow, type VoucherTravelerRow } from "./voucher";

const row: VoucherRow = {
  id: "b1",
  code: "WY-4822",
  status: "confirmed",
  paxCount: 2,
  totalCents: 258000,
  startsAt: new Date("2026-11-05T12:30:00Z"),
  slug: "machu-picchu",
  title: "Machu Picchu",
  coverImageUrl: null,
  durationDays: 4,
  nights: 3,
  meetingPoint: null,
  meetingLat: null,
  meetingLng: null,
  destinationName: "Cusco",
};

const trav = (over: Partial<VoucherTravelerRow> = {}): VoucherTravelerRow => ({
  firstName: "Ana",
  lastName: "Quispe",
  docType: "dni",
  docNumber: "12345678",
  isPrimary: true,
  ...over,
});

describe("isBookingCode", () => {
  it("AC2: acepta códigos válidos", () => {
    expect(isBookingCode("WY-4822")).toBe(true);
    expect(isBookingCode("WY-0001")).toBe(true);
  });

  it.each(["wy-4822", "WY-482", "WY-48222", "WY-48a2", "", "WY-4822 ", "../x", "WY-4822%00", "WY-4822\n"])(
    "AC2: rechaza %j",
    (code) => {
      expect(isBookingCode(code)).toBe(false);
    },
  );
});

describe("toVoucherDto", () => {
  it("AC3: conserva startsAt como Date y los nulos del punto de encuentro", () => {
    const dto = toVoucherDto(row, [trav()], null);
    expect(dto.startsAt).toBeInstanceOf(Date);
    expect(dto.startsAt).toEqual(row.startsAt);
    expect(dto.package.meetingPoint).toBeNull();
    expect(dto.package.meetingLat).toBeNull();
    expect(dto.package.meetingLng).toBeNull();
    expect(dto.package).toMatchObject({ slug: "machu-picchu", destinationName: "Cusco", nights: 3 });
  });

  it("AC3: principal primero y documento enmascarado con los últimos 4", () => {
    const dto = toVoucherDto(
      row,
      [trav({ firstName: "Luis", isPrimary: false, docNumber: "87654321" }), trav()],
      null,
    );
    expect(dto.travelers.map((t) => t.firstName)).toEqual(["Ana", "Luis"]);
    expect(dto.travelers[0].docNumberMasked).toBe("****5678");
    expect(dto.travelers[1].docNumberMasked).toBe("****4321");
  });

  it("AC3: documentos de 4 caracteres o menos dan solo ****", () => {
    for (const docNumber of ["1234", "123", "1", ""]) {
      expect(toVoucherDto(row, [trav({ docNumber })], null).travelers[0].docNumberMasked).toBe("****");
    }
  });

  it("AC3: el DTO nunca contiene el número completo", () => {
    const dto = toVoucherDto(row, [trav({ docNumber: "12345678" })], null);
    const json = JSON.stringify(dto);
    expect(json).not.toContain("12345678");
    expect(json).not.toContain("docNumber\"");
  });

  it.each([
    ["succeeded", 5000, 5000],
    ["partially_refunded", 3000, 3000],
    ["pending", 5000, null],
    ["failed", 5000, null],
    ["refunded", 5000, null],
  ] as const)("AC3: pago %s -> chargedUsdCents %s", (status, amountCents, expected) => {
    const dto = toVoucherDto(row, [trav()], { status, amountCents });
    expect(dto.chargedUsdCents).toBe(expected);
    expect(dto.paymentStatus).toBe(status);
  });

  it("AC3: sin pago -> chargedUsdCents y paymentStatus nulos", () => {
    const dto = toVoucherDto(row, [trav()], null);
    expect(dto.chargedUsdCents).toBeNull();
    expect(dto.paymentStatus).toBeNull();
  });

  it("AC3: no incluye customerId, contactEmail ni contactPhone", () => {
    const dirty = { ...row, customerId: "u1", contactEmail: "a@b.c", contactPhone: "999" };
    const dto = toVoucherDto(dirty, [trav()], null);
    expect(dto).not.toHaveProperty("customerId");
    expect(dto).not.toHaveProperty("contactEmail");
    expect(dto).not.toHaveProperty("contactPhone");
  });
});
