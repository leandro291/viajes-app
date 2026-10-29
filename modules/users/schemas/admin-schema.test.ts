import { describe, expect, it } from "vitest";

import { grantAdminSchema, revokeAdminSchema } from "./admin-schema";

const ID = "3f1c9a52-8d7e-4b1a-9c3e-2a6f5d4b7e10";

describe("grantAdminSchema", () => {
  it("AC2: acepta correo válido", () => {
    expect(grantAdminSchema.parse({ email: "ana@x.com" })).toEqual({ email: "ana@x.com" });
  });

  it("AC2: normaliza espacios y mayúsculas", () => {
    expect(grantAdminSchema.parse({ email: "  Ana@X.COM " })).toEqual({ email: "ana@x.com" });
  });

  it.each(["ana", "ana@", "@x.com", "a b@x.com", "", "   ", null, 1])(
    "AC2/AC8: rechaza correo %j",
    (email) => {
      expect(grantAdminSchema.safeParse({ email }).success).toBe(false);
    },
  );
});

describe("revokeAdminSchema", () => {
  it("AC8: acepta uuid válido", () => {
    expect(revokeAdminSchema.safeParse({ id: ID }).success).toBe(true);
  });

  it.each(["abc", "", null, 1])("AC8: rechaza id %j", (id) => {
    expect(revokeAdminSchema.safeParse({ id }).success).toBe(false);
  });
});
