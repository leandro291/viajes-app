import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { departureInputSchema, departureUpdateSchema, MAX_DEPARTURE_CAPACITY } from "./departure-schema";

const PKG = "3f2b8c1e-5a4d-4e6f-8a7b-9c0d1e2f3a4b";
const GUIDE = "7a1c9d2e-4b3f-4a5c-9d6e-1f2a3b4c5d6e";

const valid = { packageId: PKG, date: "2026-11-05", time: "07:30", capacity: 20, guideId: GUIDE };

const issue = (input: unknown, schema: z.ZodType = departureInputSchema) => {
  const r = schema.safeParse(input);
  return r.success ? null : r.error.issues[0];
};

describe("departureInputSchema", () => {
  it("AC1: entrada válida produce startsAt en hora de Lima", () => {
    const r = departureInputSchema.safeParse(valid);
    expect(r.success && r.data).toEqual({
      packageId: PKG,
      startsAt: new Date("2026-11-05T12:30:00.000Z"),
      capacity: 20,
      guideId: GUIDE,
    });
  });

  it("AC1: guideId vacío o null produce null", () => {
    for (const guideId of ["", null]) {
      const r = departureInputSchema.safeParse({ ...valid, guideId });
      expect(r.success && r.data.guideId).toBeNull();
    }
  });

  it("AC1: capacidad desde string se convierte a número", () => {
    const r = departureInputSchema.safeParse({ ...valid, capacity: "15" });
    expect(r.success && r.data.capacity).toBe(15);
  });

  it("AC1: capacidad en los límites 1 y 100 pasa", () => {
    expect(issue({ ...valid, capacity: 1 })).toBeNull();
    expect(issue({ ...valid, capacity: MAX_DEPARTURE_CAPACITY })).toBeNull();
  });

  it("AC1: capacidad fuera de rango, no entera o vacía falla en capacity", () => {
    for (const capacity of [0, 101, -3, 2.5, "", "abc", "2.5", null, undefined]) {
      const i = issue({ ...valid, capacity });
      expect(i?.path, String(capacity)).toEqual(["capacity"]);
      expect(i?.message).toBe("Ingresa una capacidad entre 1 y 100");
    }
  });

  it("AC1: fecha con formato inválido falla en date", () => {
    for (const date of ["", "5/11/2026", "2026-1-5", "2026-11-05T10:00", undefined, 20261105]) {
      expect(issue({ ...valid, date })?.path, String(date)).toEqual(["date"]);
    }
  });

  it("AC1: fecha inexistente falla en date sin rodarse a marzo", () => {
    for (const date of ["2026-02-30", "2026-13-01", "2026-04-31", "2026-02-29"]) {
      const i = issue({ ...valid, date });
      expect(i?.path, date).toEqual(["date"]);
      expect(i?.message).toBe("Ingresa una fecha válida");
    }
  });

  it("AC1: hora fuera de 00:00-23:59 falla en time", () => {
    for (const time of ["24:00", "10:60", "7:30", "", "ab:cd", undefined]) {
      expect(issue({ ...valid, time })?.path, String(time)).toEqual(["time"]);
    }
    expect(issue({ ...valid, time: "00:00" })).toBeNull();
    expect(issue({ ...valid, time: "23:59" })).toBeNull();
  });

  it("AC1: packageId y guideId no uuid fallan en su campo", () => {
    expect(issue({ ...valid, packageId: "x" })?.path).toEqual(["packageId"]);
    expect(issue({ ...valid, packageId: "x" })?.message).toBe("Elige un paquete tuyo.");
    expect(issue({ ...valid, guideId: "x" })?.path).toEqual(["guideId"]);
    expect(issue({ ...valid, guideId: "x" })?.message).toBe("Elige una guía tuya.");
  });
});

describe("departureUpdateSchema", () => {
  const { packageId: _omit, ...base } = valid;
  void _omit;
  const update = { ...base, status: "scheduled" };

  it("AC2: entrada válida incluye status y no packageId", () => {
    const r = departureUpdateSchema.safeParse({ ...update, packageId: PKG });
    expect(r.success && r.data).toEqual({
      startsAt: new Date("2026-11-05T12:30:00.000Z"),
      capacity: 20,
      guideId: GUIDE,
      status: "scheduled",
    });
  });

  it("AC2: acepta cada estado del enum", () => {
    for (const status of ["scheduled", "en_route", "completed", "cancelled"]) {
      expect(issue({ ...update, status }, departureUpdateSchema)).toBeNull();
    }
  });

  it("AC2: status inválido o ausente falla en status", () => {
    for (const status of ["foo", "", undefined]) {
      expect(issue({ ...update, status }, departureUpdateSchema)?.path).toEqual(["status"]);
    }
  });

  it("AC2: reglas de fecha, hora, capacidad y guía iguales al alta", () => {
    expect(issue({ ...update, date: "2026-02-30" }, departureUpdateSchema)?.path).toEqual(["date"]);
    expect(issue({ ...update, time: "24:00" }, departureUpdateSchema)?.path).toEqual(["time"]);
    expect(issue({ ...update, capacity: 0 }, departureUpdateSchema)?.path).toEqual(["capacity"]);
    expect(issue({ ...update, guideId: "x" }, departureUpdateSchema)?.path).toEqual(["guideId"]);
    const r = departureUpdateSchema.safeParse({ ...update, guideId: "" });
    expect(r.success && r.data.guideId).toBeNull();
  });
});
