import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { OwnOffersPage } from "@/modules/offers";

export const metadata: Metadata = { title: "Ofertas" };

export default function OfertasPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Ofertas</h1>
      <Suspense fallback={<PageSkeleton />}>
        <OwnOffersPage />
      </Suspense>
    </>
  );
}
