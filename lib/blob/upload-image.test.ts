import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({ put: vi.fn() }));

import { put } from "@vercel/blob";
import { InvalidImageError, uploadImageToBlob } from "./upload-image";

const putMock = vi.mocked(put);

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];

function file(header: number[], type: string, name = "foto-privada.bin") {
  return new File([new Uint8Array([...header, 1, 2, 3, 4])], name, { type });
}

beforeEach(() => {
  putMock.mockReset();
  putMock.mockResolvedValue({ url: "https://abc.public.blob.vercel-storage.com/images/x.png" } as never);
});

describe("uploadImageToBlob", () => {
  it.each([
    ["JPEG", JPEG, "image/jpeg", "jpg"],
    ["PNG", PNG, "image/png", "png"],
    ["WebP", WEBP, "image/webp", "webp"],
  ])("AC3: %s real se sube con access public, sin sufijo y contentType real", async (_n, header, type, ext) => {
    await uploadImageToBlob(file(header, type));

    expect(putMock).toHaveBeenCalledTimes(1);
    const [pathname, body, options] = putMock.mock.calls[0];
    expect(pathname).toMatch(/^images\/[0-9a-f-]{36}\.(jpg|png|webp)$/);
    expect(pathname.endsWith(`.${ext}`)).toBe(true);
    expect(pathname).not.toContain("foto-privada");
    expect(body).toBeInstanceOf(File);
    expect(options).toEqual({ access: "public", addRandomSuffix: false, contentType: type });
  });

  it("AC3: devuelve la url de put", async () => {
    await expect(uploadImageToBlob(file(PNG, "image/png"))).resolves.toEqual({
      url: "https://abc.public.blob.vercel-storage.com/images/x.png",
    });
  });

  it("AC5: un PDF declarado como image/png lanza InvalidImageError sin llamar a put", async () => {
    await expect(uploadImageToBlob(file(PDF, "image/png"))).rejects.toBeInstanceOf(InvalidImageError);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("AC5: RIFF que no es WebP se rechaza", async () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45];
    await expect(uploadImageToBlob(file(wav, "image/webp"))).rejects.toBeInstanceOf(InvalidImageError);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("AC5: un PNG declarado como image/jpeg se sube como png", async () => {
    await uploadImageToBlob(file(PNG, "image/jpeg"));

    const [pathname, , options] = putMock.mock.calls[0];
    expect(pathname).toMatch(/\.png$/);
    expect(options).toMatchObject({ contentType: "image/png" });
  });

  it("AC5: el error de put se propaga", async () => {
    const boom = new Error("blob caído");
    putMock.mockRejectedValue(boom);
    await expect(uploadImageToBlob(file(JPEG, "image/jpeg"))).rejects.toBe(boom);
  });
});
