const SLUG_RE = /^[a-z0-9-]{1,100}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}
