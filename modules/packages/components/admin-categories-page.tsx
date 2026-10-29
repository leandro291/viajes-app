import { requireRole } from "@/lib/auth/require-role";

import { listCategoriesWithUsage } from "../services/category-manage-service";
import { CategoryManager } from "./category-manager";

export async function AdminCategoriesPage() {
  await requireRole("admin");
  const categories = await listCategoriesWithUsage();
  return <CategoryManager categories={categories} />;
}
