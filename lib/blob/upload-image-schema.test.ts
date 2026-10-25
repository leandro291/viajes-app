import { describe, expect, it } from "vitest";
import {
  MAX_CREDIT_LENGTH,
  MAX_IMAGE_BYTES,
  uploadImageSchema,
} from "./upload-image-schema";

function image(size: number, type = "image/png") {
  return new File([new Uint8Array(size)], "x", { type });
}

function firstError(input: unknown) {
  const result = uploadImageSchema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
}

describe("uploadImageSchema file", () => {
  it("AC4: archivo ausente (null de FormData) o string -> FILE_REQUIRED", () => {
    expect(firstError({ file: null, credit: null })).toBe("FILE_REQUIRED");
    expect(firstError({ credit: null })).toBe("FILE_REQUIRED");
    expect(firstError({ file: "foto.png", credit: null })).toBe("FILE_REQUIRED");
  });

  it("AC4: archivo de 0 bytes -> FILE_EMPTY", () => {
    expect(firstError({ file: image(0), credit: null })).toBe("FILE_EMPTY");
  });

  it("AC4: exactamente 4 MiB pasa", () => {
    expect(firstError({ file: image(MAX_IMAGE_BYTES), credit: null })).toBeNull();
  });

  it("AC4: 4 MiB + 1 B -> FILE_TOO_LARGE", () => {
    expect(firstError({ file: image(MAX_IMAGE_BYTES + 1), credit: null })).toBe(
      "FILE_TOO_LARGE",
    );
  });

  it.each(["image/jpeg", "image/png", "image/webp"])("AC5: %s se acepta", (type) => {
    expect(firstError({ file: image(10, type), credit: null })).toBeNull();
  });

  it.each(["image/gif", "application/pdf", "image/svg+xml", ""])(
    "AC5: tipo %j -> INVALID_TYPE",
    (type) => {
      expect(firstError({ file: image(10, type), credit: null })).toBe("INVALID_TYPE");
    },
  );
});

describe("uploadImageSchema credit", () => {
  const file = image(10);
  const credit = (value: unknown) => {
    const result = uploadImageSchema.safeParse({ file, credit: value });
    return result.success ? result.data.credit : result.error.issues[0].message;
  };

  it("AC6: ausente, null o solo espacios -> null", () => {
    expect(uploadImageSchema.parse({ file }).credit).toBeNull();
    expect(credit(null)).toBeNull();
    expect(credit("")).toBeNull();
    expect(credit("   ")).toBeNull();
  });

  it("AC6: aplica trim", () => {
    expect(credit("  Foto: Ana (CC BY 4.0) ")).toBe("Foto: Ana (CC BY 4.0)");
  });

  it("AC6: 200 caracteres pasa y 201 -> CREDIT_INVALID", () => {
    expect(credit("a".repeat(MAX_CREDIT_LENGTH))).toBe("a".repeat(MAX_CREDIT_LENGTH));
    expect(credit("a".repeat(MAX_CREDIT_LENGTH + 1))).toBe("CREDIT_INVALID");
  });

  it("AC6: el límite se mide tras trim", () => {
    expect(credit(` ${"a".repeat(MAX_CREDIT_LENGTH)} `)).toBe("a".repeat(MAX_CREDIT_LENGTH));
  });

  it("AC6: un File en credit -> CREDIT_INVALID", () => {
    expect(credit(image(5))).toBe("CREDIT_INVALID");
  });
});
