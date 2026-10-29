import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminOffersPage } from "@/modules/offers";

export const metadata: Metadata = { title: "Ofertas" };

export default function AdminOfertasPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Ofertas</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AdminOffersPage />
      </Suspense>
    </>
  );
}
