import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminDestinationsList } from "@/modules/destinations";

export const metadata: Metadata = { title: "Destinos" };

export default function DestinosPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Destinos</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AdminDestinationsList />
      </Suspense>
    </>
  );
}
