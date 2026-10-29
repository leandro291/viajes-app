import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { DestinationEditor } from "@/modules/destinations";

export const metadata: Metadata = { title: "Nuevo destino" };

export default function NuevoDestinoPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Nuevo destino</h1>
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <DestinationEditor />
      </Suspense>
    </>
  );
}
