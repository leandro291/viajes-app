// Parte pura de catalog-action: la importan también componentes cliente (sin requireRole ni Clerk).
export type CatalogErrorCode = "NOT_FOUND" | "INVALID_INPUT" | "SLUG_TAKEN" | "HAS_PACKAGES" | "UNKNOWN";

export type CatalogResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: CatalogErrorCode; message: string; fieldErrors?: Record<string, string> };

export const CATALOG_MESSAGES: Record<CatalogErrorCode, string> = {
  NOT_FOUND: "No encontramos ese elemento.",
  INVALID_INPUT: "Revisa los campos marcados.",
  SLUG_TAKEN: "Ya existe uno con ese nombre.",
  HAS_PACKAGES: "Tiene paquetes asociados, no se puede eliminar.",
  UNKNOWN: "No pudimos guardar los cambios. Inténtalo de nuevo.",
};

export function catalogFail(
  code: CatalogErrorCode,
  fieldErrors?: Record<string, string>,
): Extract<CatalogResult, { ok: false }> {
  return { ok: false, code, message: CATALOG_MESSAGES[code], ...(fieldErrors && { fieldErrors }) };
}
