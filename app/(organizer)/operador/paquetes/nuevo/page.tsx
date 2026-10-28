import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { PackageEditor } from "@/modules/packages";

export const metadata: Metadata = { title: "Nuevo paquete" };

export default function NuevoPaquetePage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Nuevo paquete</h1>
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <PackageEditor />
      </Suspense>
    </>
  );
}
