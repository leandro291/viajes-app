import { describe, expect, it } from "vitest";

import { formatDuration, isDayTour } from "./package-utils";

describe("isDayTour", () => {
  it("AC4: day_tour con días > 1 es day tour", () => {
    expect(isDayTour({ kind: "day_tour", durationDays: 2 })).toBe(true);
  });

  it("AC4: package de 1 día es day tour", () => {
    expect(isDayTour({ kind: "package", durationDays: 1 })).toBe(true);
  });

  it("AC4: package de 3 días no es day tour", () => {
    expect(isDayTour({ kind: "package", durationDays: 3 })).toBe(false);
  });
});

describe("formatDuration", () => {
  it("AC4: singular y plural", () => {
    expect(formatDuration(1)).toBe("1 día");
    expect(formatDuration(2)).toBe("2 días");
    expect(formatDuration(10)).toBe("10 días");
  });
});
