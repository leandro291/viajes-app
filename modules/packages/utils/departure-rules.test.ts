import { describe, expect, it } from "vitest";

import {
  allowedNextStatuses,
  checkDepartureChange,
  checkNewDeparture,
  DEPARTURE_STATUS_BADGE,
  DEPARTURE_STATUS_LABELS,
  isTerminalStatus,
  soldLabel,
  type DepartureStatus,
} from "./departure-rules";

const now = new Date("2026-11-01T12:00:00.000Z");
const future = new Date("2026-11-05T12:30:00.000Z");
const future2 = new Date("2026-11-06T12:30:00.000Z");
const past = new Date("2026-10-30T12:30:00.000Z");

const current = (over: Partial<Parameters<typeof checkDepartureChange>[0]> = {}) => ({
  startsAt: future,
  capacity: 20,
  bookedSeats: 0,
  status: "scheduled" as DepartureStatus,
  ...over,
});
const next = (over: Partial<Parameters<typeof checkDepartureChange>[1]> = {}) => ({
  startsAt: future,
  capacity: 20,
  status: "scheduled" as DepartureStatus,
  ...over,
});

describe("allowedNextStatuses / isTerminalStatus", () => {
  it.each([
    ["scheduled", ["en_route", "cancelled"]],
    ["en_route", ["completed", "cancelled"]],
    ["completed", []],
    ["cancelled", []],
  ] as const)("AC4: %s -> %j", (from, expected) => {
    expect(allowedNextStatuses(from)).toEqual(expected);
  });

  it("AC4: solo completed y cancelled son terminales", () => {
    expect(isTerminalStatus("scheduled")).toBe(false);
    expect(isTerminalStatus("en_route")).toBe(false);
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
  });
});

describe("etiquetas y badges", () => {
  it("AC16: etiquetas en español", () => {
    expect(DEPARTURE_STATUS_LABELS).toEqual({
      scheduled: "Programada",
      en_route: "En ruta",
      completed: "Completada",
      cancelled: "Cancelada",
    });
  });

  it("AC16: mapa de badges", () => {
    expect(DEPARTURE_STATUS_BADGE).toEqual({
      scheduled: "neutral",
      en_route: "pending",
      completed: "confirmed",
      cancelled: "cancelled",
    });
  });
});

describe("soldLabel", () => {
  it("AC16: cupos vendidos y quedan", () => {
    expect(soldLabel(12, 20)).toEqual({ sold: "12 de 20 cupos vendidos", left: "Quedan 8" });
  });

  it("AC16: agotada cuando no quedan cupos", () => {
    expect(soldLabel(20, 20).left).toBe("Agotada");
    expect(soldLabel(25, 20).left).toBe("Agotada");
  });
});

describe("checkNewDeparture", () => {
  it("AC6: fecha futura es válida", () => {
    expect(checkNewDeparture(future, now)).toBeNull();
  });

  it("AC6: fecha pasada o igual a ahora falla en date", () => {
    const err = { code: "INVALID_INPUT", fieldErrors: { date: "Elige una fecha futura." } };
    expect(checkNewDeparture(past, now)).toEqual(err);
    expect(checkNewDeparture(now, now)).toEqual(err);
  });
});

describe("checkDepartureChange", () => {
  it.each(["completed", "cancelled"] as const)(
    "AC5: current %s -> DEPARTURE_CLOSED (prioridad sobre el resto)",
    (status) => {
      expect(
        checkDepartureChange(current({ status }), next({ status: "scheduled", capacity: 1 }), now),
      ).toEqual({ code: "DEPARTURE_CLOSED" });
    },
  );

  it.each([
    ["scheduled", "completed"],
    ["en_route", "scheduled"],
  ] as const)("AC5: %s -> %s es INVALID_TRANSITION", (from, to) => {
    expect(checkDepartureChange(current({ status: from }), next({ status: to }), now)).toEqual({
      code: "INVALID_TRANSITION",
    });
  });

  it.each([
    ["scheduled", "scheduled"],
    ["scheduled", "en_route"],
    ["scheduled", "cancelled"],
    ["en_route", "en_route"],
    ["en_route", "completed"],
    ["en_route", "cancelled"],
  ] as const)("AC5: %s -> %s es válido", (from, to) => {
    expect(checkDepartureChange(current({ status: from }), next({ status: to }), now)).toBeNull();
  });

  it("AC5: INVALID_TRANSITION gana sobre capacidad menor a vendidos", () => {
    expect(
      checkDepartureChange(
        current({ bookedSeats: 10 }),
        next({ status: "completed", capacity: 5 }),
        now,
      ),
    ).toEqual({ code: "INVALID_TRANSITION" });
  });

  it("AC5: capacidad menor a vendidos falla en capacity con N", () => {
    expect(
      checkDepartureChange(current({ bookedSeats: 12 }), next({ capacity: 8 }), now),
    ).toEqual({
      code: "INVALID_INPUT",
      fieldErrors: { capacity: "La capacidad no puede ser menor a los cupos vendidos (12)." },
    });
  });

  it("AC5: capacidad igual a vendidos es válida", () => {
    expect(
      checkDepartureChange(current({ bookedSeats: 12 }), next({ capacity: 12 }), now),
    ).toBeNull();
  });

  it("AC5: capacidad menor a vendidos gana sobre SEATS_SOLD", () => {
    expect(
      checkDepartureChange(
        current({ bookedSeats: 12 }),
        next({ capacity: 8, status: "cancelled", startsAt: future2 }),
        now,
      ),
    ).toMatchObject({ code: "INVALID_INPUT" });
  });

  it("AC5: cambiar fecha con cupos vendidos es SEATS_SOLD", () => {
    expect(
      checkDepartureChange(current({ bookedSeats: 1 }), next({ startsAt: future2 }), now),
    ).toEqual({ code: "SEATS_SOLD" });
  });

  it("AC5: cancelar con cupos vendidos es SEATS_SOLD", () => {
    expect(
      checkDepartureChange(current({ bookedSeats: 1 }), next({ status: "cancelled" }), now),
    ).toEqual({ code: "SEATS_SOLD" });
  });

  it("AC5: SEATS_SOLD gana sobre fecha pasada", () => {
    expect(
      checkDepartureChange(current({ bookedSeats: 1 }), next({ startsAt: past }), now),
    ).toEqual({ code: "SEATS_SOLD" });
  });

  it("AC5: con cupos vendidos se puede subir capacidad, pasar a en_route y completar", () => {
    expect(
      checkDepartureChange(
        current({ bookedSeats: 5 }),
        next({ capacity: 30, status: "en_route" }),
        now,
      ),
    ).toBeNull();
    expect(
      checkDepartureChange(
        current({ bookedSeats: 5, status: "en_route" }),
        next({ status: "completed" }),
        now,
      ),
    ).toBeNull();
  });

  it("AC5: sin cupos se puede cancelar y reprogramar a futuro", () => {
    expect(checkDepartureChange(current(), next({ status: "cancelled" }), now)).toBeNull();
    expect(checkDepartureChange(current(), next({ startsAt: future2 }), now)).toBeNull();
  });

  it("AC5: reprogramar a fecha pasada falla en date", () => {
    expect(checkDepartureChange(current(), next({ startsAt: past }), now)).toEqual({
      code: "INVALID_INPUT",
      fieldErrors: { date: "Elige una fecha futura." },
    });
  });

  it("AC5: sin cambiar startsAt no exige fecha futura (D5)", () => {
    expect(
      checkDepartureChange(
        current({ startsAt: past }),
        next({ startsAt: past, status: "en_route" }),
        now,
      ),
    ).toBeNull();
  });
});
