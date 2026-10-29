import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { MAX_OFFER_MIN_PEOPLE, MAX_OFFER_PERCENT, offerIdSchema, offerInputSchema, offerUpdateSchema } from "./offer-schema";

const PKG = "3f2b8c1e-5a4d-4e6f-8a7b-9c0d1e2f3a4b";

const valid = {
  packageId: PKG,
  kind: "last_minute",
  discountType: "percent",
  discountValue: 20,
  minPeople: 2,
  validUntil: "2026-11-30",
  isActive: true,
};

const issue = (input: unknown, schema: z.ZodType = offerInputSchema) => {
  const r = schema.safeParse(input);
  return r.success ? null : r.error.issues[0];
};

describe("offerInputSchema", () => {
  it("AC2: acepta porcentaje y produce OfferInput", () => {
    const r = offerInputSchema.parse(valid);
    expect(r).toEqual({ ...valid, validUntil: new Date("2026-12-01T04:59:00.000Z") });
  });

  it("AC2: acepta 2x1 con discountValue null", () => {
    const r = offerInputSchema.parse({ ...valid, discountType: "two_for_one", discountValue: null });
    expect(r.discountValue).toBeNull();
    expect(r.discountType).toBe("two_for_one");
  });

  it("AC2: strings numéricos se convierten a número", () => {
    const r = offerInputSchema.parse({ ...valid, discountValue: "25", minPeople: " 4 " });
    expect(r.discountValue).toBe(25);
    expect(r.minPeople).toBe(4);
  });

  it.each(["", null, undefined])("AC2: %j en minPeople y validUntil → null", (v) => {
    const r = offerInputSchema.parse({ ...valid, minPeople: v, validUntil: v });
    expect(r.minPeople).toBeNull();
    expect(r.validUntil).toBeNull();
  });

  it("AC2: validUntil = 23:59 de Lima (04:59Z del día siguiente)", () => {
    expect(offerInputSchema.parse(valid).validUntil?.toISOString()).toBe("2026-12-01T04:59:00.000Z");
    expect(offerInputSchema.parse({ ...valid, validUntil: "2026-06-15" }).validUntil?.toISOString()).toBe(
      "2026-06-16T04:59:00.000Z",
    );
  });

  it("AC3: 2x1 ignora el discountValue recibido", () => {
    for (const discountValue of [50, "50", 0, 999, "abc", ""]) {
      const r = offerInputSchema.parse({ ...valid, discountType: "two_for_one", discountValue });
      expect(r.discountValue).toBeNull();
    }
  });

  it.each([["", "vacío"], [null, "null"], [undefined, "undefined"], [0, "0"], [101, "101"], [12.5, "decimal"], ["12.5", "decimal string"], ["abc", "texto"], [true, "booleano"]])(
    "AC3: porcentaje %j (%s) → error en discountValue",
    (discountValue, _label) => {
      void _label;
      const i = issue({ ...valid, discountValue });
      expect(i?.path).toEqual(["discountValue"]);
      expect(i?.message).toBe("Ingresa un porcentaje entero entre 1 y 100");
    },
  );

  it("AC3: porcentaje en los límites 1 y 100", () => {
    expect(offerInputSchema.parse({ ...valid, discountValue: 1 }).discountValue).toBe(1);
    expect(offerInputSchema.parse({ ...valid, discountValue: MAX_OFFER_PERCENT }).discountValue).toBe(100);
  });

  it.each([0, 101, 2.5, "2.5", "abc", -1, true])("AC3: minPeople %j → error en minPeople", (minPeople) => {
    const i = issue({ ...valid, minPeople });
    expect(i?.path).toEqual(["minPeople"]);
    expect(i?.message).toBe("Ingresa un número entero entre 1 y 100");
  });

  it("AC3: minPeople en el máximo", () => {
    expect(offerInputSchema.parse({ ...valid, minPeople: MAX_OFFER_MIN_PEOPLE }).minPeople).toBe(100);
  });

  it.each(["2026-02-30", "2026-13-01", "30/11/2026", "abc", 20261130])(
    "AC3: validUntil %j → error en validUntil",
    (validUntil) => {
      const i = issue({ ...valid, validUntil });
      expect(i?.path).toEqual(["validUntil"]);
      expect(i?.message).toBe("Ingresa una fecha válida");
    },
  );

  it("AC3: packageId no uuid", () => {
    const i = issue({ ...valid, packageId: "x" });
    expect(i?.path).toEqual(["packageId"]);
    expect(i?.message).toBe("Elige un paquete tuyo.");
  });

  it("AC3: kind y discountType fuera del enum", () => {
    expect(issue({ ...valid, kind: "x" })?.message).toBe("Elige un tipo de oferta");
    expect(issue({ ...valid, discountType: "x" })?.message).toBe("Elige un tipo de descuento");
  });

  it.each(["true", 1, null, undefined])("AC3: isActive %j no booleano → error", (isActive) => {
    expect(issue({ ...valid, isActive })?.path).toEqual(["isActive"]);
  });
});

describe("offerUpdateSchema", () => {
  const { packageId: _packageId, ...update } = valid;
  void _packageId;

  it("AC4: acepta la entrada sin packageId", () => {
    const r = offerUpdateSchema.parse(update);
    expect(r).toEqual({ ...update, validUntil: new Date("2026-12-01T04:59:00.000Z") });
    expect(r).not.toHaveProperty("packageId");
  });

  it("AC4: aplica las mismas validaciones", () => {
    expect(issue({ ...update, discountValue: 101 }, offerUpdateSchema)?.path).toEqual(["discountValue"]);
    expect(issue({ ...update, validUntil: "2026-02-30" }, offerUpdateSchema)?.path).toEqual(["validUntil"]);
  });
});

describe("offerIdSchema", () => {
  it("AC4: valida uuid", () => {
    expect(offerIdSchema.safeParse(PKG).success).toBe(true);
    expect(offerIdSchema.safeParse("x").success).toBe(false);
  });
});
