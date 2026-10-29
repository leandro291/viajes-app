import { updateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";

import { createCategory, deleteCategory, updateCategory } from "../services/category-manage-service";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./category-actions";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/lib/auth/require-role", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/require-role")>()),
  requireRole: vi.fn(),
}));
vi.mock("../services/category-manage-service", () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

const ID = "3f0c6d52-8a4e-4c1b-9a7e-2b5d1e9f0a11";
const OK = { ok: true } as const;
const FAIL = { ok: false, code: "NOT_FOUND", message: "x" } as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(undefined as never);
});

describe("category actions", () => {
  it("AC9: AuthError sube y no toca el service", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("FORBIDDEN"));
    await expect(createCategoryAction({ name: "Aventura" })).rejects.toBeInstanceOf(AuthError);
    await expect(updateCategoryAction(ID, { name: "Aventura" })).rejects.toBeInstanceOf(AuthError);
    await expect(deleteCategoryAction(ID)).rejects.toBeInstanceOf(AuthError);
    expect(createCategory).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC9: input inválido -> INVALID_INPUT con fieldErrors, sin service ni updateTag", async () => {
    const r = await createCategoryAction({ name: "!!!" });
    expect(r).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(!r.ok && r.fieldErrors?.name).toBeTruthy();
    const u = await updateCategoryAction(ID, {});
    expect(u).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(createCategory).not.toHaveBeenCalled();
    expect(updateCategory).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC9: id no uuid -> INVALID_INPUT sin service", async () => {
    expect(await updateCategoryAction("nope", { name: "Aventura" })).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(await deleteCategoryAction("nope")).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(updateCategory).not.toHaveBeenCalled();
    expect(deleteCategory).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC9: ok -> updateTag una vez con categories y una con packages (3 actions)", async () => {
    vi.mocked(createCategory).mockResolvedValue({ ok: true, id: ID });
    vi.mocked(updateCategory).mockResolvedValue(OK);
    vi.mocked(deleteCategory).mockResolvedValue(OK);
    const calls: (() => Promise<unknown>)[] = [
      () => createCategoryAction({ name: "Aventura", slug: "x", id: "y" }),
      () => updateCategoryAction(ID, { name: "Aventura" }),
      () => deleteCategoryAction(ID),
    ];
    for (const call of calls) {
      vi.mocked(updateTag).mockClear();
      expect(await call()).toMatchObject({ ok: true });
      expect(updateTag).toHaveBeenCalledTimes(2);
      expect(updateTag).toHaveBeenCalledWith(CACHE_TAGS.categories);
      expect(updateTag).toHaveBeenCalledWith(CACHE_TAGS.packages);
    }
    // extras descartados: el service recibe solo { name }
    expect(createCategory).toHaveBeenCalledWith({ name: "Aventura" });
  });

  it("AC9: ok:false del service -> sin updateTag", async () => {
    vi.mocked(createCategory).mockResolvedValue(FAIL);
    vi.mocked(updateCategory).mockResolvedValue(FAIL);
    vi.mocked(deleteCategory).mockResolvedValue({ ok: false, code: "HAS_PACKAGES", message: "x" });
    expect(await createCategoryAction({ name: "Aventura" })).toMatchObject({ ok: false });
    expect(await updateCategoryAction(ID, { name: "Aventura" })).toMatchObject({ ok: false });
    expect(await deleteCategoryAction(ID)).toMatchObject({ ok: false, code: "HAS_PACKAGES" });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("AC9: excepción del service -> UNKNOWN, sin updateTag", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(deleteCategory).mockRejectedValue(new Error("boom secreto"));
    expect(await deleteCategoryAction(ID)).toMatchObject({ ok: false, code: "UNKNOWN" });
    expect(updateTag).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith("deleteCategoryAction: fallo inesperado");
    spy.mockRestore();
  });
});
