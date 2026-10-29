import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminOperatorsPage } from "@/modules/organizers";

export const metadata: Metadata = { title: "Operadores" };

export default function OperadoresPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Operadores</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AdminOperatorsPage />
      </Suspense>
    </>
  );
}
