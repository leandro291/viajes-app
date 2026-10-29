import { requireRole } from "@/lib/auth/require-role";
import { catalogFail, type CatalogResult } from "@/lib/catalog-result";

// Los componentes cliente importan de "@/lib/catalog-result"; acá se re-exporta para el código de servidor.
export { CATALOG_MESSAGES, catalogFail } from "@/lib/catalog-result";
export type { CatalogErrorCode, CatalogResult } from "@/lib/catalog-result";

// Sesión admin (lanza AuthError, no se captura) -> body. Un fallo inesperado devuelve UNKNOWN.
export async function runAdminAction<T>(
  name: string,
  body: () => Promise<CatalogResult<T>>,
): Promise<CatalogResult<T>> {
  await requireRole("admin");
  try {
    return await body();
  } catch {
    // Texto fijo: sin datos del input ni del error.
    console.error(`${name}: fallo inesperado`);
    return catalogFail("UNKNOWN");
  }
}
