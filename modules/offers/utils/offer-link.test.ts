import { describe, expect, it } from "vitest";

import { pickDeparture, suggestedTravelers } from "./offer-link";

describe("suggestedTravelers", () => {
  it("AC29: two_for_one -> 2", () => {
    expect(suggestedTravelers({ discountType: "two_for_one", minPeople: null })).toBe(2);
  });

  it("AC29: percent con min_people 4 -> 4", () => {
    expect(suggestedTravelers({ discountType: "percent", minPeople: 4 })).toBe(4);
  });

  it("AC29: percent sin mínimo -> 2", () => {
    expect(suggestedTravelers({ discountType: "percent", minPeople: null })).toBe(2);
  });

  it("AC29: min_people 25 -> tope 20", () => {
    expect(suggestedTravelers({ discountType: "percent", minPeople: 25 })).toBe(20);
  });
});

describe("pickDeparture", () => {
  const deps = [
    { id: "a", seatsLeft: 1 },
    { id: "b", seatsLeft: 3 },
    { id: "c", seatsLeft: 10 },
  ];

  it("AC29: devuelve la primera con cupo suficiente", () => {
    expect(pickDeparture(deps, 2)?.id).toBe("b");
    expect(pickDeparture(deps, 3)?.id).toBe("b");
  });

  it("AC29: sin cupo suficiente o sin salidas -> null", () => {
    expect(pickDeparture(deps, 11)).toBeNull();
    expect(pickDeparture([], 1)).toBeNull();
  });
});
