import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { AuthError, requireRole } from "@/lib/auth/require-role";

import { deletePackage, setPackageStatus, updatePackage } from "../services/package-manage-service";
import { MANAGE_MESSAGES } from "../utils/manage-gate";
import {
  deletePackageAdminAction,
  setPackageStatusAdminAction,
  updatePackageAdminAction,
} from "./admin-package-actions";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/lib/auth/require-role", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
vi.mock("../services/package-manage-service", () => ({
  createPackage: vi.fn(),
  updatePackage: vi.fn(),
  setPackageStatus: vi.fn(),
  deletePackage: vi.fn(),
}));

const ID = "3f0c6d52-8a4e-4c1b-9a7e-2b5d1e9f0a11";
const UUID_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
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
const services = [updatePackage, setPackageStatus, deletePackage];
const svcOf = { update: updatePackage, status: setPackageStatus, delete: deletePackage };
const fnName = {
  update: "updatePackageAdminAction",
  status: "setPackageStatusAdminAction",
  delete: "deletePackageAdminAction",
};
const calls = {
  update: (input: unknown = VALID, id = ID) => updatePackageAdminAction(id, input),
  status: (input: unknown = "published", id = ID) => setPackageStatusAdminAction(id, input),
  delete: (_input?: unknown, id = ID) => deletePackageAdminAction(id),
};
const names = ["update", "status", "delete"] as const;

describe("admin-package-actions", () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockReset().mockResolvedValue({ userId: "u1", role: "admin" });
    vi.mocked(updateTag).mockClear();
    for (const s of services)
      vi.mocked(s).mockReset().mockResolvedValue({ ok: true, id: ID, catalogChanged: false } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  describe.each(names)("%s", (name) => {
    const act = calls[name];

    it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)(
      "AC5: AuthError %s sube sin llamar al service",
      async (code) => {
        vi.mocked(requireRole).mockRejectedValue(new AuthError(code));
        await expect(act()).rejects.toMatchObject({ code });
        for (const s of services) expect(s).not.toHaveBeenCalled();
        expect(updateTag).not.toHaveBeenCalled();
      },
    );

    it("AC5: exige rol admin y el service recibe 'all'", async () => {
      await act();
      expect(requireRole).toHaveBeenCalledWith("admin");
      expect(vi.mocked(svcOf[name]).mock.calls[0][0]).toBe("all");
    });

    it("AC5: excepción del service devuelve UNKNOWN y loguea texto fijo", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(svcOf[name]).mockRejectedValue(new Error("secreto"));
      expect(await act()).toEqual({ ok: false, code: "UNKNOWN", message: MANAGE_MESSAGES.UNKNOWN });
      expect(spy).toHaveBeenCalledWith(`${fnName[name]}: fallo inesperado`);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC6: catalogChanged true invalida CACHE_TAGS.packages exactamente una vez", async () => {
      vi.mocked(svcOf[name]).mockResolvedValue({ ok: true, id: ID, catalogChanged: true } as never);
      expect(await act()).toMatchObject({ ok: true, catalogChanged: true });
      expect(updateTag).toHaveBeenCalledTimes(1);
      expect(updateTag).toHaveBeenCalledWith(CACHE_TAGS.packages);
    });

    it("AC6: catalogChanged false no invalida caché", async () => {
      expect(await act()).toMatchObject({ ok: true });
      expect(updateTag).not.toHaveBeenCalled();
    });

    it("AC6: error de negocio no invalida caché y pasa tal cual", async () => {
      const result = { ok: false, code: "NOT_FOUND", message: MANAGE_MESSAGES.NOT_FOUND };
      vi.mocked(svcOf[name]).mockResolvedValue(result as never);
      expect(await act()).toEqual(result);
      expect(updateTag).not.toHaveBeenCalled();
    });
  });

  it("AC5: update con input inválido devuelve INVALID_INPUT con fieldErrors sin llamar al service", async () => {
    const result = await calls.update({ ...VALID, title: "A", priceCents: 1 });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT", message: MANAGE_MESSAGES.INVALID_INPUT });
    expect(result).toHaveProperty("fieldErrors.title");
    for (const s of services) expect(s).not.toHaveBeenCalled();
  });

  it("AC5: el input no puede traer scope ni organizerId: el service recibe 'all' y el input limpio", async () => {
    await calls.update({ ...VALID, organizerId: "org-ajeno", scope: "x" });
    const call = vi.mocked(updatePackage).mock.calls[0];
    expect(call[0]).toBe("all");
    expect(call.at(-1)).not.toHaveProperty("organizerId");
    expect(call.at(-1)).not.toHaveProperty("scope");
  });

  it.each(names)("AC5: %s con id no uuid devuelve INVALID_INPUT sin llamar al service", async (name) => {
    const result = await calls[name](undefined as never, "no-es-uuid");
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    for (const s of services) expect(s).not.toHaveBeenCalled();
  });

  it.each(["archived", "", null, undefined, 1])("AC5: status inválido %j devuelve INVALID_INPUT", async (status) => {
    expect(await setPackageStatusAdminAction(ID, status)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    for (const s of services) expect(s).not.toHaveBeenCalled();
  });

  it("AC3: status y delete pasan 'all' e id al service", async () => {
    await setPackageStatusAdminAction(ID, "draft");
    await deletePackageAdminAction(ID);
    expect(setPackageStatus).toHaveBeenCalledWith("all", ID, "draft");
    expect(deletePackage).toHaveBeenCalledWith("all", ID);
  });
});
