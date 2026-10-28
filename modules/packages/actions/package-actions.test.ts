import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { AuthError } from "@/lib/auth/require-role";
import { getCurrentOrganizer } from "@/modules/organizers";

import {
  createPackage,
  deletePackage,
  setPackageStatus,
  updatePackage,
} from "../services/package-manage-service";
import { MANAGE_MESSAGES } from "../utils/manage-gate";
import {
  createPackageAction,
  deletePackageAction,
  setPackageStatusAction,
  updatePackageAction,
} from "./package-actions";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/modules/organizers", () => ({ getCurrentOrganizer: vi.fn() }));
vi.mock("../services/package-manage-service", () => ({
  createPackage: vi.fn(),
  updatePackage: vi.fn(),
  setPackageStatus: vi.fn(),
  deletePackage: vi.fn(),
}));

const ID = "3f0c6d52-8a4e-4c1b-9a7e-2b5d1e9f0a11";
const UUID_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const ORGANIZER = { id: "org-session", businessName: "Andes", ruc: "1", whatsapp: "1", status: "active" };
const VALID = {
  kind: "package",
  title: "Machu Picchu 3 días",
  blurb: "Tres días recorriendo la ciudadela y el Valle Sagrado.",
  description: "Un recorrido completo por Cusco, el Valle Sagrado y Machu Picchu con guía local.",
  destinationId: ID,
  categoryIds: [UUID_B],
  priceCents: 129000,
  durationDays: 3,
  nights: 2,
  maxGroupSize: 12,
  languages: ["es"],
  meetingPoint: "",
  meetingLat: null,
  meetingLng: null,
  coverImageUrl: "/seed/cusco.jpg",
  images: [],
  itinerary: [
    {
      title: "Llegada a Cusco",
      description: "Recepción en el aeropuerto y traslado al hotel.",
      place: "Cusco",
      transportLeg: "",
      imageUrl: "",
      lat: null,
      lng: null,
    },
  ],
  included: ["Transporte"],
  excluded: [],
  status: "draft",
};
const services = [createPackage, updatePackage, setPackageStatus, deletePackage];
const svcOf = { create: createPackage, update: updatePackage, status: setPackageStatus, delete: deletePackage };
const fnName = {
  create: "createPackageAction",
  update: "updatePackageAction",
  status: "setPackageStatusAction",
  delete: "deletePackageAction",
};

const calls = {
  create: (input: unknown = VALID) => createPackageAction(input),
  update: (input: unknown = VALID, id = ID) => updatePackageAction(id, input),
  status: (input: unknown = "published", id = ID) => setPackageStatusAction(id, input),
  delete: (_input?: unknown, id = ID) => deletePackageAction(id),
};
const names = ["create", "update", "status", "delete"] as const;

describe("package-actions", () => {
  beforeEach(() => {
    vi.mocked(getCurrentOrganizer).mockResolvedValue(ORGANIZER as never);
    vi.mocked(updateTag).mockClear();
    for (const s of services)
      vi.mocked(s).mockReset().mockResolvedValue({ ok: true, id: ID, catalogChanged: false } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  describe.each(names)("%s", (name) => {
    const act = calls[name];

    it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)("AC20: AuthError %s sube sin llamar al service", async (code) => {
      vi.mocked(getCurrentOrganizer).mockRejectedValue(new AuthError(code));
      await expect(act()).rejects.toMatchObject({ code });
      for (const s of services) expect(s).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC20: sin organizer devuelve NO_ORGANIZER sin llamar al service", async () => {
      vi.mocked(getCurrentOrganizer).mockResolvedValue(null);
      expect(await act()).toEqual({ ok: false, code: "NO_ORGANIZER", message: MANAGE_MESSAGES.NO_ORGANIZER });
      for (const s of services) expect(s).not.toHaveBeenCalled();
    });

    it("AC21: código de negocio del service pasa con su mensaje y no invalida caché", async () => {
      const result = { ok: false, code: "ORGANIZER_SUSPENDED", message: MANAGE_MESSAGES.ORGANIZER_SUSPENDED };
      vi.mocked(svcOf[name]).mockResolvedValue(result as never);
      expect(await act()).toEqual(result);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC21: excepción del service devuelve UNKNOWN y loguea texto fijo", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(svcOf[name]).mockRejectedValue(new Error("secreto Machu Picchu"));
      expect(await act()).toEqual({ ok: false, code: "UNKNOWN", message: MANAGE_MESSAGES.UNKNOWN });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(`${fnName[name]}: fallo inesperado`);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC22: catalogChanged true invalida CACHE_TAGS.packages exactamente una vez", async () => {
      vi.mocked(svcOf[name]).mockResolvedValue({ ok: true, id: ID, catalogChanged: true } as never);
      expect(await act()).toMatchObject({ ok: true, catalogChanged: true });
      expect(updateTag).toHaveBeenCalledTimes(1);
      expect(updateTag).toHaveBeenCalledWith(CACHE_TAGS.packages);
    });

    it("AC22: catalogChanged false no invalida caché", async () => {
      expect(await act()).toMatchObject({ ok: true });
      expect(updateTag).not.toHaveBeenCalled();
    });
  });

  describe.each(["create", "update"] as const)("%s (input)", (name) => {
    it("AC21: input inválido devuelve INVALID_INPUT con fieldErrors sin llamar al service", async () => {
      const result = await calls[name]({ ...VALID, title: "A", priceCents: 1 });
      expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT", message: MANAGE_MESSAGES.INVALID_INPUT });
      expect(result).toHaveProperty("fieldErrors.title");
      expect(result).toHaveProperty("fieldErrors.priceCents");
      for (const s of services) expect(s).not.toHaveBeenCalled();
    });

    it("AC21: input que no es objeto devuelve INVALID_INPUT", async () => {
      expect(await calls[name](null)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
      for (const s of services) expect(s).not.toHaveBeenCalled();
    });

    it("AC20: el service recibe el scope de sesión aunque el input traiga organizerId", async () => {
      await calls[name]({ ...VALID, organizerId: "org-ajeno" });
      const svc = vi.mocked(svcOf[name]);
      expect(svc).toHaveBeenCalledTimes(1);
      expect(svc.mock.calls[0][0]).toBe(ORGANIZER);
      const sent = svc.mock.calls[0].at(-1);
      expect(sent).not.toHaveProperty("organizerId");
      expect(sent).toMatchObject({ title: VALID.title, status: "draft" });
    });
  });

  it("AC21: éxito de create devuelve el id del service", async () => {
    vi.mocked(createPackage).mockResolvedValue({ ok: true, id: ID, slug: "x", catalogChanged: false } as never);
    expect(await createPackageAction(VALID)).toMatchObject({ ok: true, id: ID });
  });

  it.each(["update", "status", "delete"] as const)("AC21: %s con id no uuid devuelve INVALID_INPUT sin llamar al service", async (name) => {
    const result = await calls[name](undefined as never, "no-es-uuid");
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(result).toHaveProperty("fieldErrors");
    for (const s of services) expect(s).not.toHaveBeenCalled();
  });

  it.each(["archived", "", null, undefined, 1])("AC21: status inválido %j devuelve INVALID_INPUT sin llamar al service", async (status) => {
    const result = await setPackageStatusAction(ID, status);
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(result).toHaveProperty("fieldErrors");
    for (const s of services) expect(s).not.toHaveBeenCalled();
  });

  it("AC20: update, status y delete pasan scope de sesión e id al service", async () => {
    await updatePackageAction(ID, VALID);
    await setPackageStatusAction(ID, "draft");
    await deletePackageAction(ID);
    expect(vi.mocked(updatePackage).mock.calls[0].slice(0, 2)).toEqual([ORGANIZER, ID]);
    expect(setPackageStatus).toHaveBeenCalledWith(ORGANIZER, ID, "draft");
    expect(deletePackage).toHaveBeenCalledWith(ORGANIZER, ID);
  });
});
