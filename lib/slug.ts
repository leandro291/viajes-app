const SLUG_RE = /^[a-z0-9-]{1,100}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

// Sin tildes ni ñ, separadores colapsados a "-", sin guiones en los bordes. Vacío -> "paquete".
export function slugify(text: string, maxLength = 80): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, "");
  return slug || "paquete";
}
