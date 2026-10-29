import { revalidatePath, updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";
import { getUserByClerkId } from "@/modules/users";

import { cancelBooking } from "../services/cancellation-service";
import { cancelErrorMessage } from "../utils/cancellation";
import { cancelBookingAction } from "./cancel-booking-action";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/auth/require-role", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
vi.mock("@/modules/users", () => ({ getUserByClerkId: vi.fn() }));
vi.mock("../services/cancellation-service", () => ({ cancelBooking: vi.fn() }));

const CODE = "WY-4822";
const SESSION = "Tu sesión venció. Recarga la página.";
const UNEXPECTED = "Algo salió mal. Intenta de nuevo.";

const expectNoRevalidation = () => {
  expect(revalidatePath).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
};

describe("cancelBookingAction", () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockReset().mockResolvedValue({ userId: "user_1", role: "customer" });
    vi.mocked(getUserByClerkId).mockReset().mockResolvedValue({ id: "u-1", email: "ana@mail.com" });
    vi.mocked(cancelBooking)
      .mockReset()
      .mockResolvedValue({ ok: true, alreadyCancelled: false, refundedUsdCents: 1000 });
    vi.mocked(revalidatePath).mockClear();
    vi.mocked(updateTag).mockClear();
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(["", "wy-4822", "WY-48", "WY-48221", "../x"])(
    "AC14: código inválido %j devuelve error sin llamar al servicio",
    async (bad) => {
      const res = await cancelBookingAction(bad);
      expect(res).toEqual({ ok: false, message: cancelErrorMessage("not_found") });
      expect(requireRole).not.toHaveBeenCalled();
      expect(cancelBooking).not.toHaveBeenCalled();
      expectNoRevalidation();
    },
  );

  it("AC14: sin sesión (AuthError) devuelve el mensaje de sesión sin llamar al servicio", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("UNAUTHENTICATED"));
    expect(await cancelBookingAction(CODE)).toEqual({ ok: false, message: SESSION });
    expect(requireRole).toHaveBeenCalledWith("customer");
    expect(cancelBooking).not.toHaveBeenCalled();
    expectNoRevalidation();
  });

  it("AC14: sin usuario en users devuelve el mensaje de sesión", async () => {
    vi.mocked(getUserByClerkId).mockResolvedValue(null);
    expect(await cancelBookingAction(CODE)).toEqual({ ok: false, message: SESSION });
    expect(getUserByClerkId).toHaveBeenCalledWith("user_1");
    expect(cancelBooking).not.toHaveBeenCalled();
    expectNoRevalidation();
  });

  it("AC14: éxito cancela con el id del usuario, revalida las 3 y devuelve ok", async () => {
    expect(await cancelBookingAction(CODE)).toEqual({ ok: true });
    expect(cancelBooking).toHaveBeenCalledWith(CODE, "u-1");
    expect(revalidatePath).toHaveBeenCalledWith("/mis-reservas");
    expect(revalidatePath).toHaveBeenCalledWith("/confirmacion/WY-4822");
    expect(updateTag).toHaveBeenCalledWith("departures");
  });

  it("AC14: alreadyCancelled devuelve ok y también revalida", async () => {
    vi.mocked(cancelBooking).mockResolvedValue({ ok: true, alreadyCancelled: true, refundedUsdCents: 0 });
    expect(await cancelBookingAction(CODE)).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledTimes(2);
    expect(updateTag).toHaveBeenCalledWith("departures");
  });

  it("AC14: ok:false del servicio devuelve cancelErrorMessage(code) sin revalidar", async () => {
    vi.mocked(cancelBooking).mockResolvedValue({ ok: false, code: "too_late" });
    expect(await cancelBookingAction(CODE)).toEqual({ ok: false, message: cancelErrorMessage("too_late") });
    expectNoRevalidation();
  });

  it("AC14: excepción inesperada devuelve unexpected y loguea solo el código de reserva", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(cancelBooking).mockRejectedValue(new Error("boom ana@mail.com +51999888777 12345678"));
    expect(await cancelBookingAction(CODE)).toEqual({ ok: false, message: UNEXPECTED });
    expect(log).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(log.mock.calls[0]);
    expect(logged).toContain(CODE);
    expect(logged).not.toMatch(/ana@mail\.com|999888777|12345678|boom/);
    expectNoRevalidation();
  });
});
