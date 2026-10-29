import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";
import { CATALOG_MESSAGES } from "@/lib/catalog-result";

import { setNotificationPreference } from "../services/notification-preference-service";
import { getUserByClerkId } from "../services/user-service";
import { setNotificationPreferenceAction } from "./notification-actions";

vi.mock("@/lib/auth/require-role", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
vi.mock("../services/notification-preference-service", () => ({ setNotificationPreference: vi.fn() }));
vi.mock("../services/user-service", () => ({ getUserByClerkId: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireRole).mockResolvedValue({ userId: "clerk_1", role: "super_admin" });
  vi.mocked(getUserByClerkId).mockResolvedValue({ id: "local-1", email: "a@b.c" });
  vi.mocked(setNotificationPreference).mockResolvedValue(undefined);
});

describe("setNotificationPreferenceAction", () => {
  it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)(
    "AC12: AuthError %s sube sin tocar users ni el service",
    async (code) => {
      vi.mocked(requireRole).mockRejectedValue(new AuthError(code));
      await expect(setNotificationPreferenceAction("new_booking", true)).rejects.toMatchObject({ code });
      expect(getUserByClerkId).not.toHaveBeenCalled();
      expect(setNotificationPreference).not.toHaveBeenCalled();
    },
  );

  it("AC12: exige super_admin y usa el users.id de la sesión", async () => {
    expect(await setNotificationPreferenceAction("new_booking", false)).toEqual({ ok: true });
    expect(requireRole).toHaveBeenCalledWith("super_admin");
    expect(getUserByClerkId).toHaveBeenCalledWith("clerk_1");
    expect(setNotificationPreference).toHaveBeenCalledWith("local-1", "new_booking", false);
  });

  it("AC12: repetir la misma llamada da el mismo resultado", async () => {
    const a = await setNotificationPreferenceAction("new_booking", true);
    const b = await setNotificationPreferenceAction("new_booking", true);
    expect(a).toEqual(b);
    expect(setNotificationPreference).toHaveBeenNthCalledWith(1, "local-1", "new_booking", true);
    expect(setNotificationPreference).toHaveBeenNthCalledWith(2, "local-1", "new_booking", true);
  });

  it("AC12: sin fila local -> NOT_FOUND sin escribir", async () => {
    vi.mocked(getUserByClerkId).mockResolvedValue(null);
    expect(await setNotificationPreferenceAction("new_booking", true)).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: CATALOG_MESSAGES.NOT_FOUND,
    });
    expect(setNotificationPreference).not.toHaveBeenCalled();
  });

  it.each([
    ["otra_clave", true],
    [undefined, true],
    ["new_booking", "true"],
    ["new_booking", undefined],
  ])("AC12: key=%s enabled=%s -> INVALID_INPUT sin llamar al service", async (key, enabled) => {
    expect(await setNotificationPreferenceAction(key, enabled)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(getUserByClerkId).not.toHaveBeenCalled();
    expect(setNotificationPreference).not.toHaveBeenCalled();
  });

  it("AC12: error inesperado -> UNKNOWN y log de texto fijo", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(setNotificationPreference).mockRejectedValue(new Error("secreto"));
    expect(await setNotificationPreferenceAction("new_booking", true)).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: CATALOG_MESSAGES.UNKNOWN,
    });
    expect(spy).toHaveBeenCalledWith("setNotificationPreferenceAction: fallo inesperado");
    spy.mockRestore();
  });
});
