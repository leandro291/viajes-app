import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { DeparturesPage } from "@/modules/packages";

export const metadata: Metadata = { title: "Salidas" };

export default function SalidasPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Salidas</h1>
      <Suspense fallback={<PageSkeleton />}>
        <DeparturesPage />
      </Suspense>
    </>
  );
}
