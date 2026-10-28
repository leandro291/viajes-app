import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toFieldErrors } from "./field-errors";

describe("toFieldErrors", () => {
  it("AC11: usa el primer mensaje de cada path", () => {
    const schema = z.object({
      title: z.string().min(5, "muy corto").regex(/^a/, "debe empezar con a"),
    });
    const result = schema.safeParse({ title: "xy" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({ title: "muy corto" });
    }
  });

  it("AC11: une paths anidados y arrays con '.'", () => {
    const schema = z.object({
      itinerary: z.array(z.object({ title: z.string().min(3, "título corto") })),
      meta: z.object({ lat: z.number("lat inválida") }),
    });
    const result = schema.safeParse({
      itinerary: [{ title: "abc" }, { title: "a" }],
      meta: { lat: "x" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({
        "itinerary.1.title": "título corto",
        "meta.lat": "lat inválida",
      });
    }
  });

  it("AC11: error sin path usa la clave vacía", () => {
    const result = z.string().min(3, "corto").safeParse("a");
    expect(result.success).toBe(false);
    if (!result.success) expect(toFieldErrors(result.error)).toEqual({ "": "corto" });
  });
});
