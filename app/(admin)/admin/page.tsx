import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminDashboard } from "@/modules/admin";

export const metadata: Metadata = { title: "Resumen" };

export default function AdminPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Resumen</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AdminDashboard />
      </Suspense>
    </>
  );
}
