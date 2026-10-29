import { describe, expect, it } from "vitest";

import type { Role } from "@/lib/auth/roles";
import { type AdminChange, getAdminChange } from "./admin-change";

const CASES: [Role, "grant" | "revoke", AdminChange][] = [
  ["customer", "grant", { kind: "change", to: "admin" }],
  ["organizer", "grant", { kind: "change", to: "admin" }],
  ["admin", "grant", { kind: "noop" }],
  ["super_admin", "grant", { kind: "protected" }],
  ["customer", "revoke", { kind: "noop" }],
  ["organizer", "revoke", { kind: "noop" }],
  ["admin", "revoke", { kind: "change", to: "customer" }],
  ["super_admin", "revoke", { kind: "protected" }],
];

describe("getAdminChange", () => {
  it.each(CASES)("AC4/AC5/AC6: %s + %s", (current, op, expected) => {
    expect(getAdminChange(op, current)).toEqual(expected);
  });
});
