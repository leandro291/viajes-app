import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getCurrentOrganizer } from "@/modules/organizers";
import { MANAGE_MESSAGES } from "@/modules/packages/utils/manage-gate";

import { createOffer, deleteOffer, updateOffer } from "../services/offer-manage-service";
import { createOfferAction, deleteOfferAction, updateOfferAction } from "./offer-actions";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/modules/organizers", () => ({ getCurrentOrganizer: vi.fn() }));
// El barrel de packages exige DATABASE_URL: se reexportan solo las piezas puras reales que usa la action.
vi.mock("@/modules/packages", async () => ({
  withOrganizer: (await import("@/modules/packages/actions/with-organizer")).withOrganizer,
  manageFail: (await import("@/modules/packages/utils/manage-gate")).manageFail,
  toFieldErrors: (await import("@/modules/packages/utils/field-errors")).toFieldErrors,
}));
vi.mock("../services/offer-manage-service", () => ({
  createOffer: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),
}));

const ID = "3f0c6d52-8a4e-4c1b-9a7e-2b5d1e9f0a11";
const ORGANIZER = { id: "org-session", businessName: "Andes", ruc: "1", whatsapp: "1", status: "active" };
const TERMS = { kind: "last_minute", discountType: "percent", discountValue: 15, minPeople: 2, validUntil: "2026-12-31", isActive: true };
const CREATE = { packageId: ID, ...TERMS };
const UPDATE = TERMS;
// Los términos (transform) solo se validan si la forma del objeto es válida: dos casos distintos.
const BAD = { ...CREATE, discountValue: 0, validUntil: "no-fecha" };
const BAD_SHAPE = { ...CREATE, kind: "x" };
const services = [createOffer, updateOffer, deleteOffer];
const nameOf = { create: "createOfferAction", update: "updateOfferAction", delete: "deleteOfferAction" };

const calls = {
  create: (input: unknown = CREATE) => createOfferAction(input),
  update: (input: unknown = UPDATE, id = ID) => updateOfferAction(id, input),
  delete: (_input?: unknown, id = ID) => deleteOfferAction(id),
};

describe("offer-actions", () => {
  beforeEach(() => {
    vi.mocked(getCurrentOrganizer).mockResolvedValue(ORGANIZER as never);
    vi.mocked(updateTag).mockClear();
    for (const s of services) {
      vi.mocked(s).mockReset().mockResolvedValue({ ok: true, id: ID, catalogChanged: true } as never);
    }
  });
  afterEach(() => vi.restoreAllMocks());

  describe.each(["create", "update", "delete"] as const)("%s", (name) => {
    const act = calls[name];

    it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)("AC14: AuthError %s sube sin llamar al service", async (code) => {
      vi.mocked(getCurrentOrganizer).mockRejectedValue(new AuthError(code));
      await expect(act()).rejects.toMatchObject({ code });
      for (const s of services) expect(s).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC14: sin organizer devuelve NO_ORGANIZER sin llamar al service ni invalidar", async () => {
      vi.mocked(getCurrentOrganizer).mockResolvedValue(null);
      expect(await act()).toEqual({ ok: false, code: "NO_ORGANIZER", message: MANAGE_MESSAGES.NO_ORGANIZER });
      for (const s of services) expect(s).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC14: error de negocio del service pasa con su mensaje y no invalida", async () => {
      const result = { ok: false, code: "ORGANIZER_SUSPENDED", message: MANAGE_MESSAGES.ORGANIZER_SUSPENDED };
      for (const s of services) vi.mocked(s).mockResolvedValue(result as never);
      expect(await act()).toEqual(result);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC14: excepción del service devuelve UNKNOWN, loguea texto fijo y no invalida", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      for (const s of services) vi.mocked(s).mockRejectedValue(new Error("secreto Ana Quispe"));
      expect(await act()).toEqual({ ok: false, code: "UNKNOWN", message: MANAGE_MESSAGES.UNKNOWN });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(`${nameOf[name]}: fallo inesperado`);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC15: ok con catalogChanged invalida el tag de ofertas y no filtra catalogChanged", async () => {
      const result = await act();
      expect(result).toMatchObject({ ok: true });
      expect(result).not.toHaveProperty("catalogChanged");
      expect(updateTag).toHaveBeenCalledTimes(1);
      expect(updateTag).toHaveBeenCalledWith(CACHE_TAGS.offers);
    });

    it("AC15: ok sin catalogChanged no invalida", async () => {
      for (const s of services) vi.mocked(s).mockResolvedValue({ ok: true, id: ID, catalogChanged: false } as never);
      const result = await act();
      expect(result).toMatchObject({ ok: true });
      expect(result).not.toHaveProperty("catalogChanged");
      expect(updateTag).not.toHaveBeenCalled();
    });
  });

  describe.each(["create", "update"] as const)("%s (input)", (name) => {
    it("AC14: input inválido devuelve INVALID_INPUT con fieldErrors sin llamar al service", async () => {
      const result = await calls[name](BAD);
      expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT", message: MANAGE_MESSAGES.INVALID_INPUT });
      expect(result).toHaveProperty("fieldErrors.discountValue");
      expect(result).toHaveProperty("fieldErrors.validUntil");
      for (const s of services) expect(s).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC14: kind inválido devuelve INVALID_INPUT con fieldErrors.kind", async () => {
      expect(await calls[name](BAD_SHAPE)).toHaveProperty("fieldErrors.kind");
      for (const s of services) expect(s).not.toHaveBeenCalled();
    });

    it("AC14: el service recibe el scope de sesión aunque el input traiga organizerId", async () => {
      const base = name === "create" ? CREATE : UPDATE;
      await calls[name]({ ...base, organizerId: "org-ajeno" });
      const svc = vi.mocked(name === "create" ? createOffer : updateOffer);
      expect(svc).toHaveBeenCalledTimes(1);
      expect(svc.mock.calls[0][0]).toBe(ORGANIZER);
      expect(svc.mock.calls[0][name === "create" ? 1 : 2]).not.toHaveProperty("organizerId");
    });
  });

  it("AC14: éxito de create devuelve el id del service sin catalogChanged", async () => {
    expect(await createOfferAction(CREATE)).toEqual({ ok: true, id: ID });
    expect(createOffer).toHaveBeenCalledWith(
      ORGANIZER,
      expect.objectContaining({ packageId: ID, kind: "last_minute", discountValue: 15, minPeople: 2 }),
    );
  });

  it.each(["update", "delete"] as const)("AC14: %s con id no uuid devuelve INVALID_INPUT sin llamar al service", async (name) => {
    const result = await calls[name](UPDATE, "no-es-uuid");
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(result).toHaveProperty("fieldErrors");
    for (const s of services) expect(s).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC14: update y delete pasan scope de sesión e id al service", async () => {
    await updateOfferAction(ID, UPDATE);
    await deleteOfferAction(ID);
    expect(updateOffer).toHaveBeenCalledWith(ORGANIZER, ID, expect.objectContaining({ kind: "last_minute", isActive: true }));
    expect(deleteOffer).toHaveBeenCalledWith(ORGANIZER, ID);
  });
});
