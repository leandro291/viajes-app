import { auth } from "@clerk/nextjs/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidImageError, uploadImageToBlob } from "./upload-image";
import { uploadImage } from "./upload-image-action";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("./upload-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./upload-image")>()),
  uploadImageToBlob: vi.fn(),
}));

const URL_OK = "https://abc.public.blob.vercel-storage.com/images/x.png";
const png = (size = 10, type = "image/png") => new File([new Uint8Array(size).fill(1)], "foto.png", { type });

const form = (file?: FormDataEntryValue, credit?: FormDataEntryValue | null) => {
  const fd = new FormData();
  if (file !== undefined) fd.set("file", file);
  if (credit !== undefined && credit !== null) fd.set("credit", credit);
  return fd;
};

const asRole = (role?: string) =>
  vi.mocked(auth).mockResolvedValue({
    userId: role ? "user_1" : null,
    sessionClaims: role ? { metadata: { role } } : null,
  } as never);

describe("uploadImage", () => {
  beforeEach(() => {
    asRole("organizer");
    vi.mocked(uploadImageToBlob).mockReset();
    vi.mocked(uploadImageToBlob).mockResolvedValue({ url: URL_OK });
  });
  afterEach(() => vi.restoreAllMocks());

  it("AC1: sin sesión lanza AuthError UNAUTHENTICATED y no llama al servicio", async () => {
    asRole();
    await expect(uploadImage(form(png()))).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(uploadImageToBlob).not.toHaveBeenCalled();
  });

  it("AC1: customer lanza AuthError FORBIDDEN y no llama al servicio", async () => {
    asRole("customer");
    await expect(uploadImage(form(png()))).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(uploadImageToBlob).not.toHaveBeenCalled();
  });

  it.each(["organizer", "admin", "super_admin"])("AC1: %s continúa", async (role) => {
    asRole(role);
    await expect(uploadImage(form(png()))).resolves.toMatchObject({ ok: true });
  });

  it("AC2: éxito devuelve url del servicio y credit", async () => {
    const file = png();
    const result = await uploadImage(form(file, "Foto: Ana"));
    expect(result).toEqual({ ok: true, url: URL_OK, credit: "Foto: Ana" });
    expect(uploadImageToBlob).toHaveBeenCalledWith(file);
  });

  it("AC6: crédito con espacios se recorta", async () => {
    const result = await uploadImage(form(png(), "  Foto: Ana (CC BY 4.0) "));
    expect(result).toMatchObject({ ok: true, credit: "Foto: Ana (CC BY 4.0)" });
  });

  it.each([["ausente", undefined], ["vacío", ""], ["solo espacios", "   "]])(
    "AC6: crédito %s -> null",
    async (_name, credit) => {
      const result = await uploadImage(form(png(), credit));
      expect(result).toEqual({ ok: true, url: URL_OK, credit: null });
    },
  );

  const rejections: [string, () => FormData, string, string][] = [
    ["archivo ausente", () => form(), "FILE_REQUIRED", "Selecciona una imagen"],
    ["archivo string", () => form("hola"), "FILE_REQUIRED", "Selecciona una imagen"],
    ["archivo vacío", () => form(png(0)), "FILE_EMPTY", "El archivo está vacío"],
    ["archivo > 4 MiB", () => form(png(4 * 1024 * 1024 + 1)), "FILE_TOO_LARGE", "La imagen supera los 4 MB"],
    ["tipo no permitido", () => form(png(10, "image/gif")), "INVALID_TYPE", "Usa una imagen JPG, PNG o WebP"],
    ["crédito > 200", () => form(png(), "a".repeat(201)), "CREDIT_INVALID", "El crédito no puede superar 200 caracteres"],
    ["crédito File", () => form(png(), png()), "CREDIT_INVALID", "El crédito no puede superar 200 caracteres"],
  ];

  it.each(rejections)("AC8: %s -> %s con mensaje, sin llamar al servicio", async (_n, build, error, message) => {
    await expect(uploadImage(build())).resolves.toEqual({ ok: false, error, message });
    expect(uploadImageToBlob).not.toHaveBeenCalled();
  });

  it("AC8: InvalidImageError del servicio -> INVALID_TYPE", async () => {
    vi.mocked(uploadImageToBlob).mockRejectedValue(new InvalidImageError());
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(uploadImage(form(png()))).resolves.toEqual({
      ok: false,
      error: "INVALID_TYPE",
      message: "Usa una imagen JPG, PNG o WebP",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("AC7: fallo genérico -> UPLOAD_FAILED sin relanzar y con log de texto fijo", async () => {
    vi.mocked(uploadImageToBlob).mockRejectedValue(new Error("token secreto foto.png"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(uploadImage(form(png()))).resolves.toEqual({
      ok: false,
      error: "UPLOAD_FAILED",
      message: "No pudimos subir la imagen. Inténtalo de nuevo",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("uploadImage: fallo al subir a Blob");
  });
});
