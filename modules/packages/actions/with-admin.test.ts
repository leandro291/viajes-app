import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";

import { MANAGE_MESSAGES } from "../utils/manage-gate";
import { withAdmin } from "./with-admin";

vi.mock("@/lib/auth/require-role", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));

describe("withAdmin", () => {
  const body = vi.fn();

  beforeEach(() => {
    body.mockReset().mockResolvedValue({ ok: true });
    vi.mocked(requireRole).mockReset().mockResolvedValue({ userId: "u1", role: "admin" });
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)(
    "AC5: AuthError %s sube sin ejecutar el body",
    async (code) => {
      vi.mocked(requireRole).mockRejectedValue(new AuthError(code));
      await expect(withAdmin("x", body)).rejects.toMatchObject({ code });
      expect(body).not.toHaveBeenCalled();
    },
  );

  it.each(["admin", "super_admin"] as const)("AC5: %s pasa y el body recibe 'all'", async (role) => {
    vi.mocked(requireRole).mockResolvedValue({ userId: "u1", role });
    expect(await withAdmin("x", body)).toEqual({ ok: true });
    expect(requireRole).toHaveBeenCalledWith("admin");
    expect(body).toHaveBeenCalledWith("all");
  });

  it("AC5: error inesperado del body devuelve UNKNOWN y loguea texto fijo", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    body.mockRejectedValue(new Error("secreto"));
    expect(await withAdmin("miAction", body)).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: MANAGE_MESSAGES.UNKNOWN,
    });
    expect(spy).toHaveBeenCalledWith("miAction: fallo inesperado");
  });
});
