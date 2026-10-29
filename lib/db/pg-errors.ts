type PgErrorLike = { code?: unknown; constraint?: unknown; constraint_name?: unknown; cause?: unknown };

const asObject = (v: unknown): PgErrorLike | null =>
  typeof v === "object" && v !== null ? (v as PgErrorLike) : null;

// Drizzle envuelve el error de `pg` en `cause`: se revisa el error y su causa.
export function findPgError(error: unknown, code: string): PgErrorLike | null {
  const top = asObject(error);
  if (top?.code === code) return top;
  const cause = asObject(top?.cause);
  return cause?.code === code ? cause : null;
}

export const isFkViolation = (error: unknown): boolean => findPgError(error, "23503") !== null;

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const e = findPgError(error, "23505");
  if (!e) return false;
  return constraint === undefined || (e.constraint ?? e.constraint_name) === constraint;
}
