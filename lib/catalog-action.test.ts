import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";

import { CATALOG_MESSAGES, catalogFail, runAdminAction, type CatalogErrorCode } from "./catalog-action";

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(),
  AuthError: class AuthError extends Error {
    constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
      super(code);
    }
  },
}));

describe("catalog-action", () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockReset().mockResolvedValue({ userId: "u", role: "admin" } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("AC3: pide rol admin y devuelve el resultado del body", async () => {
    const body = vi.fn().mockResolvedValue({ ok: true, id: "x" });
    await expect(runAdminAction("act", body)).resolves.toEqual({ ok: true, id: "x" });
    expect(requireRole).toHaveBeenCalledWith("admin");
  });

  it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)("AC3: AuthError %s sube sin ejecutar el body", async (code) => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError(code));
    const body = vi.fn();
    await expect(runAdminAction("act", body)).rejects.toMatchObject({ code });
    expect(body).not.toHaveBeenCalled();
  });

  it("AC3: body que lanza -> UNKNOWN y log de texto fijo sin el mensaje del error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runAdminAction("createX", async () => {
      throw new Error("secreto-del-input");
    });
    expect(result).toEqual({ ok: false, code: "UNKNOWN", message: CATALOG_MESSAGES.UNKNOWN });
    expect(spy).toHaveBeenCalledExactlyOnceWith("createX: fallo inesperado");
  });

  it("AC3: catalogFail arma mensaje y fieldErrors opcionales", () => {
    expect(catalogFail("NOT_FOUND")).toEqual({ ok: false, code: "NOT_FOUND", message: CATALOG_MESSAGES.NOT_FOUND });
    expect(catalogFail("SLUG_TAKEN", { name: "x" })).toMatchObject({
      code: "SLUG_TAKEN",
      message: CATALOG_MESSAGES.SLUG_TAKEN,
      fieldErrors: { name: "x" },
    });
  });

  it("AC3: hay mensaje en español no vacío para cada código", () => {
    const codes: CatalogErrorCode[] = ["NOT_FOUND", "INVALID_INPUT", "SLUG_TAKEN", "HAS_PACKAGES", "UNKNOWN"];
    expect(Object.keys(CATALOG_MESSAGES).sort()).toEqual([...codes].sort());
    for (const c of codes) expect(CATALOG_MESSAGES[c].length).toBeGreaterThan(0);
  });
});
