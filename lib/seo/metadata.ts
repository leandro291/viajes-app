import type { Metadata } from "next";

export const SITE_NAME = "Wayra";
export const DEFAULT_TITLE = "Wayra · Paquetes y tours en Perú";
export const DEFAULT_DESCRIPTION =
  "Descubre y reserva paquetes y tours de un día por Perú con operadores locales.";

const MAX_DESCRIPTION = 160;

// Next reemplaza (no mezcla) `openGraph`: sin images explícitas se pierde la imagen de app/opengraph-image.tsx.
const BRAND_IMAGE_URL = "/opengraph-image";
const BRAND_IMAGE = { url: BRAND_IMAGE_URL, width: 1200, height: 630, alt: DEFAULT_TITLE };

export function truncateDescription(text: string, max = MAX_DESCRIPTION): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  // Deja lugar para "…" y retrocede al último espacio para no cortar una palabra.
  const head = clean.slice(0, max - 1);
  const space = clean[max - 1] === " " ? head.length : head.lastIndexOf(" ");
  const cut = space > 0 ? head.slice(0, space) : head;
  return `${cut.trimEnd()}…`;
}

export type SeoInput = {
  title?: string;
  description?: string | null;
  path: string;
  image?: string | null;
  imageAlt?: string;
  noIndex?: boolean;
};

export function buildMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  noIndex,
}: SeoInput): Metadata {
  const desc = truncateDescription(description || DEFAULT_DESCRIPTION);
  const socialTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;

  return {
    ...(title ? { title } : {}),
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "es_PE",
      siteName: SITE_NAME,
      url: path,
      title: socialTitle,
      description: desc,
      images: image ? [{ url: image, ...(imageAlt ? { alt: imageAlt } : {}) }] : [BRAND_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: desc,
      images: [image ?? BRAND_IMAGE_URL],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
