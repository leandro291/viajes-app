import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminCategoriesPage } from "@/modules/packages";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriasPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Categorías</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AdminCategoriesPage />
      </Suspense>
    </>
  );
}
