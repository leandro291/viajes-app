import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { MANAGE_MESSAGES } from "@/modules/packages/utils/manage-gate";

import { createOffer, deleteOffer, updateOffer } from "../services/offer-manage-service";
import {
  createOfferAdminAction,
  deleteOfferAdminAction,
  updateOfferAdminAction,
} from "./admin-offer-actions";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/lib/auth/require-role", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
// El barrel de packages exige DATABASE_URL: se reexportan solo las piezas puras reales que usa la action.
vi.mock("@/modules/packages", async () => ({
  withAdmin: (await import("@/modules/packages/actions/with-admin")).withAdmin,
  manageFail: (await import("@/modules/packages/utils/manage-gate")).manageFail,
  toFieldErrors: (await import("@/modules/packages/utils/field-errors")).toFieldErrors,
}));
vi.mock("../services/offer-manage-service", () => ({
  createOffer: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),
}));

const ID = "3f0c6d52-8a4e-4c1b-9a7e-2b5d1e9f0a11";
const TERMS = { kind: "last_minute", discountType: "percent", discountValue: 15, minPeople: 2, validUntil: "2026-12-31", isActive: true };
const CREATE = { packageId: ID, ...TERMS };
const BAD = { ...CREATE, discountValue: 0, validUntil: "no-fecha" };
const services = [createOffer, updateOffer, deleteOffer];

const calls = {
  create: (input: unknown = CREATE) => createOfferAdminAction(input),
  update: (input: unknown = TERMS, id = ID) => updateOfferAdminAction(id, input),
  delete: (_input?: unknown, id = ID) => deleteOfferAdminAction(id),
};

describe("admin-offer-actions", () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockReset().mockResolvedValue(undefined as never);
    vi.mocked(updateTag).mockClear();
    for (const s of services) {
      vi.mocked(s).mockReset().mockResolvedValue({ ok: true, id: ID, catalogChanged: true } as never);
    }
  });
  afterEach(() => vi.restoreAllMocks());

  describe.each(["create", "update", "delete"] as const)("%s", (name) => {
    const act = calls[name];

    it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)("AC5: AuthError %s sube sin llamar al service ni invalidar", async (code) => {
      vi.mocked(requireRole).mockRejectedValue(new AuthError(code));
      await expect(act()).rejects.toMatchObject({ code });
      expect(requireRole).toHaveBeenCalledWith("admin");
      for (const s of services) expect(s).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC6: ok con catalogChanged invalida offers y no filtra catalogChanged", async () => {
      const result = await act();
      expect(result).toMatchObject({ ok: true });
      expect(result).not.toHaveProperty("catalogChanged");
      expect(updateTag).toHaveBeenCalledTimes(1);
      expect(updateTag).toHaveBeenCalledWith(CACHE_TAGS.offers);
    });

    it("AC6: ok sin catalogChanged no invalida", async () => {
      for (const s of services) vi.mocked(s).mockResolvedValue({ ok: true, id: ID, catalogChanged: false } as never);
      expect(await act()).toMatchObject({ ok: true });
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC5: excepción del service devuelve UNKNOWN con log fijo y no invalida", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      for (const s of services) vi.mocked(s).mockRejectedValue(new Error("secreto"));
      expect(await act()).toEqual({ ok: false, code: "UNKNOWN", message: MANAGE_MESSAGES.UNKNOWN });
      expect(spy).toHaveBeenCalledWith(expect.stringMatching(/AdminAction: fallo inesperado$/));
      expect(updateTag).not.toHaveBeenCalled();
    });
  });

  describe.each(["create", "update"] as const)("%s (input)", (name) => {
    it("AC5: input inválido devuelve INVALID_INPUT con fieldErrors sin llamar al service", async () => {
      const result = await calls[name](BAD);
      expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT", message: MANAGE_MESSAGES.INVALID_INPUT });
      expect(result).toHaveProperty("fieldErrors.discountValue");
      for (const s of services) expect(s).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC5: el service recibe scope 'all' aunque el input traiga organizerId o scope", async () => {
      const base = name === "create" ? CREATE : TERMS;
      await calls[name]({ ...base, organizerId: "org-ajeno", scope: { id: "x" } });
      const svc = vi.mocked(name === "create" ? createOffer : updateOffer);
      expect(svc).toHaveBeenCalledTimes(1);
      expect(svc.mock.calls[0][0]).toBe("all");
      expect(svc.mock.calls[0][name === "create" ? 1 : 2]).not.toHaveProperty("organizerId");
    });
  });

  it.each(["update", "delete"] as const)("AC5: %s con id no uuid devuelve INVALID_INPUT sin llamar al service", async (name) => {
    expect(await calls[name](TERMS, "no-es-uuid")).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    for (const s of services) expect(s).not.toHaveBeenCalled();
  });

  it("AC8: crea sobre un paquete ajeno (scope 'all') y devuelve solo el id", async () => {
    expect(await createOfferAdminAction(CREATE)).toEqual({ ok: true, id: ID });
    expect(createOffer).toHaveBeenCalledWith("all", expect.objectContaining({ packageId: ID, kind: "last_minute" }));
  });

  it("AC8: update y delete pasan 'all' e id al service", async () => {
    await updateOfferAdminAction(ID, TERMS);
    await deleteOfferAdminAction(ID);
    expect(updateOffer).toHaveBeenCalledWith("all", ID, expect.objectContaining({ kind: "last_minute" }));
    expect(deleteOffer).toHaveBeenCalledWith("all", ID);
  });
});
