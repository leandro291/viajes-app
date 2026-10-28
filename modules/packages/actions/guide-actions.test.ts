import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError } from "@/lib/auth/require-role";
import { getCurrentOrganizer } from "@/modules/organizers";

import { createGuide, deleteGuide, updateGuide } from "../services/guide-service";
import { MANAGE_MESSAGES } from "../utils/manage-gate";
import { createGuideAction, deleteGuideAction, updateGuideAction } from "./guide-actions";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/modules/organizers", () => ({ getCurrentOrganizer: vi.fn() }));
vi.mock("../services/guide-service", () => ({
  createGuide: vi.fn(),
  updateGuide: vi.fn(),
  deleteGuide: vi.fn(),
}));

const ID = "3f0c6d52-8a4e-4c1b-9a7e-2b5d1e9f0a11";
const ORGANIZER = { id: "org-session", businessName: "Andes", ruc: "1", whatsapp: "1", status: "active" };
const VALID = { name: "Ana Quispe", phone: "+51 900 000 000" };
const services = [createGuide, updateGuide, deleteGuide];

const calls = {
  create: (input: unknown = VALID) => createGuideAction(input),
  update: (input: unknown = VALID, id = ID) => updateGuideAction(id, input),
  delete: (_input?: unknown, id = ID) => deleteGuideAction(id),
};

describe("guide-actions", () => {
  beforeEach(() => {
    vi.mocked(getCurrentOrganizer).mockResolvedValue(ORGANIZER as never);
    for (const s of services) vi.mocked(s).mockReset().mockResolvedValue({ ok: true, id: ID } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  describe.each(["create", "update", "delete"] as const)("%s", (name) => {
    const act = calls[name];

    it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)("AC20: AuthError %s sube sin llamar al service", async (code) => {
      vi.mocked(getCurrentOrganizer).mockRejectedValue(new AuthError(code));
      await expect(act()).rejects.toMatchObject({ code });
      for (const s of services) expect(s).not.toHaveBeenCalled();
    });

    it("AC20: sin organizer devuelve NO_ORGANIZER sin llamar al service", async () => {
      vi.mocked(getCurrentOrganizer).mockResolvedValue(null);
      expect(await act()).toEqual({ ok: false, code: "NO_ORGANIZER", message: MANAGE_MESSAGES.NO_ORGANIZER });
      for (const s of services) expect(s).not.toHaveBeenCalled();
    });

    it("AC21: código de negocio del service pasa con su mensaje", async () => {
      const result = { ok: false, code: "ORGANIZER_SUSPENDED", message: MANAGE_MESSAGES.ORGANIZER_SUSPENDED };
      for (const s of services) vi.mocked(s).mockResolvedValue(result as never);
      expect(await act()).toEqual(result);
    });

    it("AC21: excepción del service devuelve UNKNOWN y loguea texto fijo", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      for (const s of services) vi.mocked(s).mockRejectedValue(new Error("secreto Ana Quispe"));
      expect(await act()).toEqual({ ok: false, code: "UNKNOWN", message: MANAGE_MESSAGES.UNKNOWN });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(`${name}GuideAction: fallo inesperado`);
    });
  });

  describe.each(["create", "update"] as const)("%s (input)", (name) => {
    it("AC21: input inválido devuelve INVALID_INPUT con fieldErrors sin llamar al service", async () => {
      const result = await calls[name]({ name: "A", phone: "abc" });
      expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT", message: MANAGE_MESSAGES.INVALID_INPUT });
      expect(result).toHaveProperty("fieldErrors.name");
      expect(result).toHaveProperty("fieldErrors.phone");
      for (const s of services) expect(s).not.toHaveBeenCalled();
    });

    it("AC20: el service recibe el scope de sesión aunque el input traiga organizerId", async () => {
      await calls[name]({ ...VALID, organizerId: "org-ajeno" });
      const svc = vi.mocked(name === "create" ? createGuide : updateGuide);
      expect(svc).toHaveBeenCalledTimes(1);
      expect(svc.mock.calls[0][0]).toBe(ORGANIZER);
      expect(svc.mock.calls[0].at(-1)).toEqual(VALID);
    });
  });

  it("AC21: éxito de create devuelve el id del service", async () => {
    expect(await createGuideAction(VALID)).toEqual({ ok: true, id: ID });
    expect(createGuide).toHaveBeenCalledWith(ORGANIZER, VALID);
  });

  it.each(["update", "delete"] as const)("AC21: %s con id no uuid devuelve INVALID_INPUT sin llamar al service", async (name) => {
    const result = await calls[name](VALID, "no-es-uuid");
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    for (const s of services) expect(s).not.toHaveBeenCalled();
  });

  it("AC22: un éxito de cada action no invalida caché", async () => {
    vi.mocked(updateTag).mockClear();
    expect(await createGuideAction(VALID)).toMatchObject({ ok: true });
    expect(await updateGuideAction(ID, VALID)).toMatchObject({ ok: true });
    expect(await deleteGuideAction(ID)).toMatchObject({ ok: true });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC20: update y delete pasan scope de sesión e id al service", async () => {
    await updateGuideAction(ID, VALID);
    await deleteGuideAction(ID);
    expect(updateGuide).toHaveBeenCalledWith(ORGANIZER, ID, VALID);
    expect(deleteGuide).toHaveBeenCalledWith(ORGANIZER, ID);
  });
});
