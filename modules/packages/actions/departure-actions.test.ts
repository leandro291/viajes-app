import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getCurrentOrganizer } from "@/modules/organizers";

import { createDeparture, deleteDeparture, updateDeparture } from "../services/departure-manage-service";
import { MANAGE_MESSAGES } from "../utils/manage-gate";
import { createDepartureAction, deleteDepartureAction, updateDepartureAction } from "./departure-actions";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/modules/organizers", () => ({ getCurrentOrganizer: vi.fn() }));
vi.mock("../services/departure-manage-service", () => ({
  createDeparture: vi.fn(),
  updateDeparture: vi.fn(),
  deleteDeparture: vi.fn(),
}));

const ID = "3f0c6d52-8a4e-4c1b-9a7e-2b5d1e9f0a11";
const GUIDE = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const ORGANIZER = { id: "org-session", businessName: "Andes", ruc: "1", whatsapp: "1", status: "active" };
const CREATE = { packageId: ID, date: "2026-11-05", time: "07:30", capacity: 20, guideId: GUIDE };
const UPDATE = { date: "2026-11-05", time: "07:30", capacity: 20, guideId: GUIDE, status: "scheduled" };
const services = [createDeparture, updateDeparture, deleteDeparture];
const nameOf = { create: "createDepartureAction", update: "updateDepartureAction", delete: "deleteDepartureAction" };

const calls = {
  create: (input: unknown = CREATE) => createDepartureAction(input),
  update: (input: unknown = UPDATE, id = ID) => updateDepartureAction(id, input),
  delete: (_input?: unknown, id = ID) => deleteDepartureAction(id),
};

describe("departure-actions", () => {
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

    it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)("AC13: AuthError %s sube sin llamar al service", async (code) => {
      vi.mocked(getCurrentOrganizer).mockRejectedValue(new AuthError(code));
      await expect(act()).rejects.toMatchObject({ code });
      for (const s of services) expect(s).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC13: sin organizer devuelve NO_ORGANIZER sin llamar al service ni invalidar", async () => {
      vi.mocked(getCurrentOrganizer).mockResolvedValue(null);
      expect(await act()).toEqual({ ok: false, code: "NO_ORGANIZER", message: MANAGE_MESSAGES.NO_ORGANIZER });
      for (const s of services) expect(s).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC13: error de negocio del service pasa con su mensaje y no invalida", async () => {
      const result = { ok: false, code: "SEATS_SOLD", message: MANAGE_MESSAGES.SEATS_SOLD };
      for (const s of services) vi.mocked(s).mockResolvedValue(result as never);
      expect(await act()).toEqual(result);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC13: excepción del service devuelve UNKNOWN, loguea texto fijo y no invalida", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      for (const s of services) vi.mocked(s).mockRejectedValue(new Error("secreto Ana Quispe"));
      expect(await act()).toEqual({ ok: false, code: "UNKNOWN", message: MANAGE_MESSAGES.UNKNOWN });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(`${nameOf[name]}: fallo inesperado`);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC13: ok con catalogChanged invalida el tag de salidas y no filtra catalogChanged", async () => {
      const result = await act();
      expect(result).toMatchObject({ ok: true });
      expect(result).not.toHaveProperty("catalogChanged");
      expect(updateTag).toHaveBeenCalledTimes(1);
      expect(updateTag).toHaveBeenCalledWith(CACHE_TAGS.departures);
    });

    it("AC13: ok sin catalogChanged no invalida", async () => {
      for (const s of services) vi.mocked(s).mockResolvedValue({ ok: true, id: ID, catalogChanged: false } as never);
      const result = await act();
      expect(result).toMatchObject({ ok: true });
      expect(result).not.toHaveProperty("catalogChanged");
      expect(updateTag).not.toHaveBeenCalled();
    });
  });

  describe.each(["create", "update"] as const)("%s (input)", (name) => {
    it("AC13: input inválido devuelve INVALID_INPUT con fieldErrors sin llamar al service", async () => {
      const result = await calls[name]({ capacity: 0, date: "x", time: "99:99", status: "foo" });
      expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT", message: MANAGE_MESSAGES.INVALID_INPUT });
      expect(result).toHaveProperty("fieldErrors.capacity");
      expect(result).toHaveProperty("fieldErrors.time");
      for (const s of services) expect(s).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC13: el service recibe el scope de sesión aunque el input traiga organizerId", async () => {
      const base = name === "create" ? CREATE : UPDATE;
      await calls[name]({ ...base, organizerId: "org-ajeno" });
      const svc = vi.mocked(name === "create" ? createDeparture : updateDeparture);
      expect(svc).toHaveBeenCalledTimes(1);
      expect(svc.mock.calls[0][0]).toBe(ORGANIZER);
      expect(svc.mock.calls[0].at(-1)).not.toHaveProperty("organizerId");
    });
  });

  it("AC13: éxito de create devuelve el id del service sin catalogChanged", async () => {
    expect(await createDepartureAction(CREATE)).toEqual({ ok: true, id: ID });
    expect(createDeparture).toHaveBeenCalledWith(ORGANIZER, expect.objectContaining({ packageId: ID, capacity: 20, guideId: GUIDE }));
  });

  it.each(["update", "delete"] as const)("AC13: %s con id no uuid devuelve INVALID_INPUT sin llamar al service", async (name) => {
    const result = await calls[name](UPDATE, "no-es-uuid");
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(result).toHaveProperty("fieldErrors");
    for (const s of services) expect(s).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC13: update y delete pasan scope de sesión e id al service", async () => {
    await updateDepartureAction(ID, UPDATE);
    await deleteDepartureAction(ID);
    expect(updateDeparture).toHaveBeenCalledWith(ORGANIZER, ID, expect.objectContaining({ status: "scheduled", capacity: 20 }));
    expect(deleteDeparture).toHaveBeenCalledWith(ORGANIZER, ID);
  });
});
