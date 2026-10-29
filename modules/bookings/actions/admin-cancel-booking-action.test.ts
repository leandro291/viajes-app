import { revalidatePath, updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";

import { cancelBookingAsAdmin } from "../services/cancellation-service";
import { adminCancelErrorMessage } from "../utils/cancellation";
import { cancelBookingAsAdminAction } from "./admin-cancel-booking-action";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/auth/require-role", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
vi.mock("../services/cancellation-service", () => ({ cancelBookingAsAdmin: vi.fn() }));

const CODE = "WY-4822";
const SESSION = "Tu sesión venció. Recarga la página.";
const FORBIDDEN = "No tienes permiso para esta acción.";
const UNEXPECTED = "Algo salió mal. Intenta de nuevo.";

const expectNoRevalidation = () => {
  expect(revalidatePath).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
};

describe("cancelBookingAsAdminAction", () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockReset().mockResolvedValue({ userId: "user_1", role: "admin" });
    vi.mocked(cancelBookingAsAdmin)
      .mockReset()
      .mockResolvedValue({ ok: true, alreadyCancelled: false, refundedUsdCents: 1000 });
    vi.mocked(revalidatePath).mockClear();
    vi.mocked(updateTag).mockClear();
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(["", "wy-4822", "WY-48", "WY-48221", "../x"])(
    "AC10: código inválido %j devuelve error sin llamar a requireRole ni al servicio",
    async (bad) => {
      expect(await cancelBookingAsAdminAction(bad)).toEqual({
        ok: false,
        message: adminCancelErrorMessage("not_found"),
      });
      expect(requireRole).not.toHaveBeenCalled();
      expect(cancelBookingAsAdmin).not.toHaveBeenCalled();
      expectNoRevalidation();
    },
  );

  it("AC10: sin sesión (UNAUTHENTICATED) devuelve el mensaje de sesión sin llamar al servicio", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("UNAUTHENTICATED"));
    expect(await cancelBookingAsAdminAction(CODE)).toEqual({ ok: false, message: SESSION });
    expect(requireRole).toHaveBeenCalledWith("admin");
    expect(cancelBookingAsAdmin).not.toHaveBeenCalled();
    expectNoRevalidation();
  });

  it("AC10: rol insuficiente (FORBIDDEN) devuelve el mensaje de permiso sin llamar al servicio", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("FORBIDDEN"));
    expect(await cancelBookingAsAdminAction(CODE)).toEqual({ ok: false, message: FORBIDDEN });
    expect(requireRole).toHaveBeenCalledWith("admin");
    expect(cancelBookingAsAdmin).not.toHaveBeenCalled();
    expectNoRevalidation();
  });

  it("AC11: éxito cancela solo con el código, revalida las 4 y devuelve ok", async () => {
    expect(await cancelBookingAsAdminAction(CODE)).toEqual({ ok: true });
    expect(requireRole).toHaveBeenCalledWith("admin");
    expect(cancelBookingAsAdmin).toHaveBeenCalledWith(CODE);
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/reservas");
    expect(revalidatePath).toHaveBeenCalledWith("/mis-reservas");
    expect(revalidatePath).toHaveBeenCalledWith("/confirmacion/WY-4822");
    expect(updateTag).toHaveBeenCalledWith("departures");
  });

  it("AC11: alreadyCancelled devuelve ok y revalida las 4", async () => {
    vi.mocked(cancelBookingAsAdmin).mockResolvedValue({ ok: true, alreadyCancelled: true, refundedUsdCents: 0 });
    expect(await cancelBookingAsAdminAction(CODE)).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    expect(updateTag).toHaveBeenCalledWith("departures");
  });

  it("AC11: ok:false del servicio devuelve adminCancelErrorMessage(code) sin revalidar", async () => {
    vi.mocked(cancelBookingAsAdmin).mockResolvedValue({ ok: false, code: "no_refundable_payment" });
    expect(await cancelBookingAsAdminAction(CODE)).toEqual({
      ok: false,
      message: adminCancelErrorMessage("no_refundable_payment"),
    });
    expectNoRevalidation();
  });

  it("AC11: excepción inesperada devuelve el genérico y loguea solo el código de reserva", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(cancelBookingAsAdmin).mockRejectedValue(new Error("boom ana@mail.com +51999888777 12345678"));
    expect(await cancelBookingAsAdminAction(CODE)).toEqual({ ok: false, message: UNEXPECTED });
    expect(log).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(log.mock.calls[0]);
    expect(logged).toContain(CODE);
    expect(logged).not.toMatch(/ana@mail\.com|999888777|12345678|boom/);
    expectNoRevalidation();
  });
});
