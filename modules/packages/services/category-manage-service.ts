import { asc, count, eq } from "drizzle-orm";

import { CATALOG_MESSAGES, catalogFail, type CatalogResult } from "@/lib/catalog-action";
import { categories, db, packageCategories } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/pg-errors";
import { slugify } from "@/lib/slug";

import type { CategoryAdminDto, CategoryInput } from "../schemas/category-schema";

// Sin "use cache": lecturas del panel directo a la BD.
export async function listCategoriesWithUsage(): Promise<CategoryAdminDto[]> {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      packageCount: count(packageCategories.packageId),
    })
    .from(categories)
    .leftJoin(packageCategories, eq(packageCategories.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}

export async function createCategory(input: CategoryInput): Promise<CatalogResult<{ id: string }>> {
  try {
    const [row] = await db
      .insert(categories)
      .values({ slug: slugify(input.name), name: input.name })
      .returning({ id: categories.id });
    return { ok: true, id: row.id };
  } catch (error) {
    if (isUniqueViolation(error)) return catalogFail("SLUG_TAKEN", { name: CATALOG_MESSAGES.SLUG_TAKEN });
    throw error;
  }
}

// Solo `name`: el slug nunca cambia (afecta URLs y filtros).
export async function updateCategory(id: string, input: CategoryInput): Promise<CatalogResult> {
  const rows = await db
    .update(categories)
    .set({ name: input.name })
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return rows.length ? { ok: true } : catalogFail("NOT_FOUND");
}

// package_categories es cascade: se bloquea si está en uso (la ventana de carrera es aceptada, ver spec).
export async function deleteCategory(id: string): Promise<CatalogResult> {
  const [found] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id));
  if (!found) return catalogFail("NOT_FOUND");
  const [{ used }] = await db
    .select({ used: count() })
    .from(packageCategories)
    .where(eq(packageCategories.categoryId, id));
  if (used > 0) return catalogFail("HAS_PACKAGES");
  await db.delete(categories).where(eq(categories.id, id));
  return { ok: true };
}
