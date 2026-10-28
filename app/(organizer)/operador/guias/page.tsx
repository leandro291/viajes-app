import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { GuidesPage } from "@/modules/packages";

export const metadata: Metadata = { title: "Guías" };

export default function GuiasPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Guías</h1>
      <Suspense fallback={<PageSkeleton />}>
        <GuidesPage />
      </Suspense>
    </>
  );
}
