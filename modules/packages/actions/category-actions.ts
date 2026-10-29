"use server";

import { updateTag } from "next/cache";
import type { z } from "zod";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { catalogFail, runAdminAction } from "@/lib/catalog-action";
import type { CatalogResult } from "@/lib/catalog-action";

import { categoryIdSchema, categoryInputSchema } from "../schemas/category-schema";
import { createCategory, deleteCategory, updateCategory } from "../services/category-manage-service";
import { toFieldErrors } from "../utils/field-errors";

const invalid = (error: z.ZodError) => catalogFail("INVALID_INPUT", toFieldErrors(error));

// Invalida la caché solo tras un resultado ok, fuera del try/catch de runAdminAction.
async function run<T extends object>(
  name: string,
  body: () => Promise<CatalogResult<T>>,
): Promise<CatalogResult<T>> {
  const result = await runAdminAction(name, body);
  if (result.ok) {
    updateTag(CACHE_TAGS.categories);
    updateTag(CACHE_TAGS.packages);
  }
  return result;
}

export async function createCategoryAction(input: unknown): Promise<CatalogResult<{ id: string }>> {
  return run<{ id: string }>("createCategoryAction", async () => {
    const parsed = categoryInputSchema.safeParse(input);
    return parsed.success ? createCategory(parsed.data) : invalid(parsed.error);
  });
}

export async function updateCategoryAction(id: string, input: unknown): Promise<CatalogResult> {
  return run("updateCategoryAction", async () => {
    const idParsed = categoryIdSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const parsed = categoryInputSchema.safeParse(input);
    return parsed.success ? updateCategory(idParsed.data, parsed.data) : invalid(parsed.error);
  });
}

export async function deleteCategoryAction(id: string): Promise<CatalogResult> {
  return run("deleteCategoryAction", async () => {
    const idParsed = categoryIdSchema.safeParse(id);
    return idParsed.success ? deleteCategory(idParsed.data) : invalid(idParsed.error);
  });
}
