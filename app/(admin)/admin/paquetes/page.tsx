import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminPackagesList } from "@/modules/packages";

export const metadata: Metadata = { title: "Paquetes" };

export default function AdminPaquetesPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Paquetes</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AdminPackagesList />
      </Suspense>
    </>
  );
}
