import { describe, expect, it } from "vitest";

import { hasRole, roleFromClaims } from "./roles";

describe("roleFromClaims", () => {
  it("lee el rol de metadata", () => {
    expect(roleFromClaims({ metadata: { role: "organizer" } })).toBe("organizer");
  });

  it.each([null, undefined, {}, { metadata: {} }, { metadata: { role: "root" } }, { metadata: { role: 1 } }])(
    "sin rol válido = customer (%j)",
    (claims) => {
      expect(roleFromClaims(claims)).toBe("customer");
    },
  );
});

describe("hasRole", () => {
  it("customer solo cumple customer", () => {
    expect(hasRole("customer", "customer")).toBe(true);
    expect(hasRole("customer", "organizer")).toBe(false);
  });

  it("admin amplio: entra a organizer y customer, no a super_admin", () => {
    expect(hasRole("admin", "organizer")).toBe(true);
    expect(hasRole("admin", "customer")).toBe(true);
    expect(hasRole("admin", "super_admin")).toBe(false);
  });

  it("organizer no entra a admin", () => {
    expect(hasRole("organizer", "admin")).toBe(false);
  });
});
