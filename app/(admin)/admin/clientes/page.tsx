import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminCustomersPage } from "@/modules/admin";

export const metadata: Metadata = { title: "Clientes" };

export default function AdminClientesPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Clientes</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AdminCustomersPage />
      </Suspense>
    </>
  );
}
