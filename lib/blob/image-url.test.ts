import { describe, expect, it } from "vitest";

import { IMAGE_URL_RE, isAllowedImageUrl } from "./image-url";

describe("isAllowedImageUrl", () => {
  it("AC1: acepta Blob https y /seed/<archivo>", () => {
    expect(isAllowedImageUrl("https://abc123.public.blob.vercel-storage.com/x/foto.jpg")).toBe(true);
    expect(isAllowedImageUrl("/seed/x.jpg")).toBe(true);
  });

  it("AC1: rechaza http, otros hosts, javascript: y vacío", () => {
    expect(isAllowedImageUrl("http://a.public.blob.vercel-storage.com/x.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://evil.com/x.jpg")).toBe(false);
    expect(isAllowedImageUrl("javascript:alert(1)")).toBe(false);
    expect(IMAGE_URL_RE.test("javascript:alert(1)")).toBe(false);
    expect(isAllowedImageUrl("")).toBe(false);
  });
});
