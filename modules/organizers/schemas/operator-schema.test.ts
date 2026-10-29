import { describe, expect, it } from "vitest";

import { operatorStatusSchema } from "./operator-schema";

const ID = "3f1c9a52-8d7e-4b1a-9c3e-2a6f5d4b7e10";

describe("operatorStatusSchema", () => {
  it.each(["active", "suspended"])("AC7: acepta status %s", (status) => {
    expect(operatorStatusSchema.safeParse({ id: ID, status }).success).toBe(true);
  });

  it("AC7: rechaza id que no es uuid", () => {
    expect(operatorStatusSchema.safeParse({ id: "abc", status: "active" }).success).toBe(false);
  });

  it.each(["pending", "ACTIVE", "", null, 1])("AC7: rechaza status %s", (status) => {
    expect(operatorStatusSchema.safeParse({ id: ID, status }).success).toBe(false);
  });
});
