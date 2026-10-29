import { updateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";

import { createDestination, deleteDestination, updateDestination } from "../services/destination-manage-service";
import { createDestinationAction, deleteDestinationAction, updateDestinationAction } from "./destination-actions";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/lib/auth/require-role", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
// El barrel de packages exige DATABASE_URL: se reexporta solo la pieza pura real que usa la action.
vi.mock("@/modules/packages", async () => ({
  toFieldErrors: (await import("@/modules/packages/utils/field-errors")).toFieldErrors,
}));
vi.mock("../services/destination-manage-service", () => ({
  createDestination: vi.fn(),
  updateDestination: vi.fn(),
  deleteDestination: vi.fn(),
}));

const ID = "3f0c6d52-8a4e-4c1b-9a7e-2b5d1e9f0a11";
const OK = { ok: true } as const;
const FAIL = { ok: false, code: "NOT_FOUND", message: "x" } as const;

const input = () => ({
  name: "Cusco",
  region: "Cusco",
  heroImageUrl: "https://abc123.public.blob.vercel-storage.com/destinos/foto-1.jpg",
  climate: Array<null>(12).fill(null),
  sights: [],
  faqs: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(undefined as never);
});

describe("destination actions", () => {
  it("AC18: AuthError sube y no toca el service", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("FORBIDDEN"));
    await expect(createDestinationAction(input())).rejects.toBeInstanceOf(AuthError);
    await expect(updateDestinationAction(ID, input())).rejects.toBeInstanceOf(AuthError);
    await expect(deleteDestinationAction(ID)).rejects.toBeInstanceOf(AuthError);
    expect(createDestination).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC18: input inválido -> INVALID_INPUT con fieldErrors, sin service ni updateTag", async () => {
    const r = await createDestinationAction({ ...input(), name: "!!!" });
    expect(r).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(!r.ok && r.fieldErrors?.name).toBeTruthy();
    expect(await updateDestinationAction(ID, {})).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(createDestination).not.toHaveBeenCalled();
    expect(updateDestination).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC18: id no uuid -> INVALID_INPUT sin service", async () => {
    expect(await updateDestinationAction("nope", input())).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(await deleteDestinationAction("nope")).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(updateDestination).not.toHaveBeenCalled();
    expect(deleteDestination).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC19: ok -> updateTag una vez con destinations y una con packages (3 actions)", async () => {
    vi.mocked(createDestination).mockResolvedValue({ ok: true, id: ID, slug: "cusco" });
    vi.mocked(updateDestination).mockResolvedValue(OK);
    vi.mocked(deleteDestination).mockResolvedValue(OK);
    const calls: (() => Promise<unknown>)[] = [
      () => createDestinationAction(input()),
      () => updateDestinationAction(ID, input()),
      () => deleteDestinationAction(ID),
    ];
    for (const call of calls) {
      vi.mocked(updateTag).mockClear();
      expect(await call()).toMatchObject({ ok: true });
      expect(updateTag).toHaveBeenCalledTimes(2);
      expect(updateTag).toHaveBeenCalledWith(CACHE_TAGS.destinations);
      expect(updateTag).toHaveBeenCalledWith(CACHE_TAGS.packages);
    }
  });

  it("AC18: slug e id extra en el input no llegan al service", async () => {
    vi.mocked(createDestination).mockResolvedValue({ ok: true, id: ID, slug: "cusco" });
    await createDestinationAction({ ...input(), slug: "hack", id: "y" });
    const arg = vi.mocked(createDestination).mock.calls[0][0];
    expect(arg).not.toHaveProperty("slug");
    expect(arg).not.toHaveProperty("id");
  });

  it("AC19: ok:false del service -> sin updateTag", async () => {
    vi.mocked(createDestination).mockResolvedValue({ ok: false, code: "SLUG_TAKEN", message: "x" });
    vi.mocked(updateDestination).mockResolvedValue(FAIL);
    vi.mocked(deleteDestination).mockResolvedValue({ ok: false, code: "HAS_PACKAGES", message: "x" });
    expect(await createDestinationAction(input())).toMatchObject({ ok: false, code: "SLUG_TAKEN" });
    expect(await updateDestinationAction(ID, input())).toMatchObject({ ok: false });
    expect(await deleteDestinationAction(ID)).toMatchObject({ ok: false, code: "HAS_PACKAGES" });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC19: excepción del service -> UNKNOWN, sin updateTag", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(deleteDestination).mockRejectedValue(new Error("boom secreto"));
    expect(await deleteDestinationAction(ID)).toMatchObject({ ok: false, code: "UNKNOWN" });
    expect(updateTag).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith("deleteDestinationAction: fallo inesperado");
    spy.mockRestore();
  });
});
