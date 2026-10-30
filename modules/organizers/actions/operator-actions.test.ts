import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";

import { setOperatorStatus } from "../services/operator-service";
import { OPERATOR_MESSAGES } from "../types/organizer-manage";
import { setOperatorStatusAction } from "./operator-actions";

vi.mock("@/lib/auth/require-role", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
vi.mock("../services/operator-service", () => ({ setOperatorStatus: vi.fn() }));

const ID = "3f1c9a52-8d7e-4b1a-9c3e-2a6f5d4b7e10";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireRole).mockResolvedValue({ userId: "u1", role: "admin" });
  vi.mocked(setOperatorStatus).mockResolvedValue({ ok: true, status: "active" });
});

describe("setOperatorStatusAction", () => {
  it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)(
    "AC7: AuthError %s sube sin llamar al service",
    async (code) => {
      vi.mocked(requireRole).mockRejectedValue(new AuthError(code));
      await expect(setOperatorStatusAction(ID, "active")).rejects.toMatchObject({ code });
      expect(setOperatorStatus).not.toHaveBeenCalled();
    },
  );

  it.each(["admin", "super_admin"] as const)("AC7: %s pasa", async (role) => {
    vi.mocked(requireRole).mockResolvedValue({ userId: "u1", role });
    expect(await setOperatorStatusAction(ID, "active")).toEqual({ ok: true, status: "active" });
    expect(requireRole).toHaveBeenCalledWith("admin");
    expect(setOperatorStatus).toHaveBeenCalledWith(ID, "active");
  });

  it.each([
    ["abc", "active"],
    [ID, "pending"],
    [ID, undefined],
  ])("AC7: id=%s status=%s -> INVALID_INPUT sin llamar al service", async (id, status) => {
    expect(await setOperatorStatusAction(id, status)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(setOperatorStatus).not.toHaveBeenCalled();
  });

  it("AC7: error inesperado -> UNKNOWN y log de texto fijo", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(setOperatorStatus).mockRejectedValue(new Error("secreto"));
    expect(await setOperatorStatusAction(ID, "suspended")).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: OPERATOR_MESSAGES.UNKNOWN,
    });
    expect(spy).toHaveBeenCalledWith("setOperatorStatusAction: fallo inesperado");
    spy.mockRestore();
  });
});
