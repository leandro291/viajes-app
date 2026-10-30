import { describe, expect, it } from "vitest";
import { buildMetadata, DEFAULT_DESCRIPTION, DEFAULT_TITLE, truncateDescription } from "./metadata";

describe("truncateDescription", () => {
  it("AC4: colapsa espacios y saltos de línea", () => {
    expect(truncateDescription("  hola \n\n  mundo\t ")).toBe("hola mundo");
  });

  it("AC4: no agrega … si no recortó", () => {
    expect(truncateDescription("a".repeat(160))).toBe("a".repeat(160));
  });

  it("AC4: recorta en palabra y agrega …", () => {
    const out = truncateDescription("uno dos tres cuatro cinco", 15);
    expect(out).toBe("uno dos tres…");
    expect(out.length).toBeLessThanOrEqual(15);
  });

  it("AC4: no corta a mitad de palabra cuando el corte cae justo en un espacio", () => {
    expect(truncateDescription("uno dos tres cuatro", 13)).toBe("uno dos tres…");
  });

  it("AC4: palabra única más larga que max se corta duro", () => {
    expect(truncateDescription("a".repeat(30), 10)).toBe(`${"a".repeat(9)}…`);
  });

  it("AC4: el resultado nunca supera 160 por defecto", () => {
    const out = truncateDescription("palabra ".repeat(100));
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("buildMetadata", () => {
  it("AC3: canonical y og:url son el path", () => {
    const m = buildMetadata({ title: "Paquetes", path: "/paquetes" });
    expect(m.alternates?.canonical).toBe("/paquetes");
    expect(m.openGraph?.url).toBe("/paquetes");
  });

  it("AC3: OG y Twitter llevan sufijo y campos fijos", () => {
    const m = buildMetadata({ title: "Paquetes", path: "/paquetes" });
    expect(m.title).toBe("Paquetes");
    expect(m.openGraph).toMatchObject({
      type: "website",
      locale: "es_PE",
      siteName: "Wayra",
      title: "Paquetes · Wayra",
    });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Paquetes · Wayra" });
  });

  it("AC14: sin image cae a la imagen de marca con tamaño y alt", () => {
    const m = buildMetadata({ title: "x", path: "/x" });
    expect(m.openGraph?.images).toEqual([
      { url: "/opengraph-image", width: 1200, height: 630, alt: DEFAULT_TITLE },
    ]);
    expect(m.twitter?.images).toEqual(["/opengraph-image"]);
  });

  it("AC15: con image y alt define images", () => {
    const m = buildMetadata({ title: "x", path: "/x", image: "/seed/a.jpg", imageAlt: "Foto" });
    expect(m.openGraph?.images).toEqual([{ url: "/seed/a.jpg", alt: "Foto" }]);
    expect(m.twitter?.images).toEqual(["/seed/a.jpg"]);
  });

  it("AC3: noIndex agrega robots index/follow false", () => {
    expect(buildMetadata({ path: "/x", noIndex: true }).robots).toEqual({ index: false, follow: false });
    expect(buildMetadata({ path: "/x" })).not.toHaveProperty("robots");
  });

  it("AC3: sin title (Inicio) no define title y usa DEFAULT_TITLE en OG", () => {
    const m = buildMetadata({ path: "/" });
    expect(m).not.toHaveProperty("title");
    expect(m.openGraph?.title).toBe(DEFAULT_TITLE);
    expect(m.twitter?.title).toBe(DEFAULT_TITLE);
  });

  it("AC3: description nula o vacía usa el default", () => {
    expect(buildMetadata({ path: "/", description: null }).description).toBe(DEFAULT_DESCRIPTION);
    expect(buildMetadata({ path: "/", description: "" }).description).toBe(DEFAULT_DESCRIPTION);
  });

  it("AC4: la descripción pasa por truncateDescription (espacios y largo)", () => {
    const m = buildMetadata({ path: "/", description: `a   b\n${"palabra ".repeat(40)}` });
    expect(m.description).not.toMatch(/\s{2}|\n/);
    expect((m.description as string).length).toBeLessThanOrEqual(160);
    expect(m.openGraph?.description).toBe(m.description);
  });
});
