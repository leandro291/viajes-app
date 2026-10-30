import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";

import { grantAdmin, revokeAdmin } from "../services/admin-service";
import { ADMIN_MESSAGES } from "../types/admin-manage";
import { grantAdminAction, revokeAdminAction } from "./admin-actions";

vi.mock("@/lib/auth/require-role", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
vi.mock("../services/admin-service", () => ({ grantAdmin: vi.fn(), revokeAdmin: vi.fn() }));

const ID = "3f1c9a52-8d7e-4b1a-9c3e-2a6f5d4b7e10";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireRole).mockResolvedValue({ userId: "u1", role: "super_admin" });
  vi.mocked(grantAdmin).mockResolvedValue({ ok: true });
  vi.mocked(revokeAdmin).mockResolvedValue({ ok: true });
});

describe("grantAdminAction", () => {
  it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)(
    "AC8: AuthError %s sube sin llamar al service",
    async (code) => {
      vi.mocked(requireRole).mockRejectedValue(new AuthError(code));
      await expect(grantAdminAction("a@b.com")).rejects.toMatchObject({ code });
      expect(grantAdmin).not.toHaveBeenCalled();
    },
  );

  it("AC8: un admin recibe FORBIDDEN", async () => {
    vi.mocked(requireRole).mockImplementation(async (role) => {
      if (role !== "admin") throw new AuthError("FORBIDDEN");
      return { userId: "u1", role: "admin" };
    });
    await expect(grantAdminAction("a@b.com")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(grantAdmin).not.toHaveBeenCalled();
  });

  it("AC8: super_admin pasa con el correo normalizado", async () => {
    expect(await grantAdminAction("  Nuevo@Mail.COM ")).toEqual({ ok: true });
    expect(requireRole).toHaveBeenCalledWith("super_admin");
    expect(grantAdmin).toHaveBeenCalledWith("nuevo@mail.com");
  });

  it.each(["abc", "", undefined, 5])("AC8: email=%s -> INVALID_INPUT sin llamar al service", async (email) => {
    expect(await grantAdminAction(email)).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
      fieldErrors: { email: expect.any(String) },
    });
    expect(grantAdmin).not.toHaveBeenCalled();
  });

  it("AC8: error inesperado -> UNKNOWN y log de texto fijo", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(grantAdmin).mockRejectedValue(new Error("secreto"));
    expect(await grantAdminAction("a@b.com")).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: ADMIN_MESSAGES.UNKNOWN,
    });
    expect(spy).toHaveBeenCalledWith("grantAdminAction: fallo inesperado");
    spy.mockRestore();
  });
});

describe("revokeAdminAction", () => {
  it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)(
    "AC8: AuthError %s sube sin llamar al service",
    async (code) => {
      vi.mocked(requireRole).mockRejectedValue(new AuthError(code));
      await expect(revokeAdminAction(ID)).rejects.toMatchObject({ code });
      expect(revokeAdmin).not.toHaveBeenCalled();
    },
  );

  it("AC8: un admin recibe FORBIDDEN", async () => {
    vi.mocked(requireRole).mockImplementation(async (role) => {
      if (role !== "admin") throw new AuthError("FORBIDDEN");
      return { userId: "u1", role: "admin" };
    });
    await expect(revokeAdminAction(ID)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(revokeAdmin).not.toHaveBeenCalled();
  });

  it("AC8: super_admin pasa", async () => {
    expect(await revokeAdminAction(ID)).toEqual({ ok: true });
    expect(requireRole).toHaveBeenCalledWith("super_admin");
    expect(revokeAdmin).toHaveBeenCalledWith(ID);
  });

  it.each(["abc", "", undefined])("AC8: id=%s -> INVALID_INPUT sin llamar al service", async (id) => {
    expect(await revokeAdminAction(id)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(revokeAdmin).not.toHaveBeenCalled();
  });

  it("AC8: error inesperado -> UNKNOWN y log de texto fijo", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(revokeAdmin).mockRejectedValue(new Error("secreto"));
    expect(await revokeAdminAction(ID)).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: ADMIN_MESSAGES.UNKNOWN,
    });
    expect(spy).toHaveBeenCalledWith("revokeAdminAction: fallo inesperado");
    spy.mockRestore();
  });
});
