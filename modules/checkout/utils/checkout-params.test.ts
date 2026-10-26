import { describe, expect, it } from "vitest";
import { parseCheckoutParams } from "./checkout-params";

const A = "3f2b8c1e-9d4a-4b7e-8a1c-2d5e6f7a8b9c";
const B = "a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d";

describe("parseCheckoutParams", () => {
  it("AC4: params válidos", () => {
    expect(
      parseCheckoutParams({ salida: A, viajeros: "2", oferta: B }),
    ).toEqual({
      salida: A,
      viajeros: 2,
      oferta: B,
    });
  });

  it("AC4: sin oferta", () => {
    expect(parseCheckoutParams({ salida: A, viajeros: "1" })).toEqual({
      salida: A,
      viajeros: 1,
    });
  });

  it("AC4: arrays -> primer valor", () => {
    expect(
      parseCheckoutParams({
        salida: [A, B],
        viajeros: ["3", "4"],
        oferta: [B],
      }),
    ).toEqual({
      salida: A,
      viajeros: 3,
      oferta: B,
    });
  });

  it.each(["0", "21", "abc", "2.5", "", "-1", "020"])(
    "AC4: viajeros %j se descarta",
    (v) => {
      expect(parseCheckoutParams({ salida: A, viajeros: v })).toEqual({
        salida: A,
      });
    },
  );

  it("AC4: viajeros 20 es el tope válido", () => {
    expect(parseCheckoutParams({ viajeros: "20" })).toEqual({ viajeros: 20 });
  });

  it("AC4: salida y oferta no uuid se descartan sin lanzar", () => {
    expect(
      parseCheckoutParams({ salida: "zzz", oferta: "123", viajeros: "2" }),
    ).toEqual({
      viajeros: 2,
    });
  });

  it("AC4: vacío o undefined", () => {
    expect(parseCheckoutParams({})).toEqual({});
    expect(parseCheckoutParams({ salida: undefined, viajeros: [] })).toEqual(
      {},
    );
  });
});
