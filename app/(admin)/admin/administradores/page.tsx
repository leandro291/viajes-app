import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminUsersPage } from "@/modules/users";

export const metadata: Metadata = { title: "Administradores" };

export default function AdministradoresPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Administradores</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AdminUsersPage />
      </Suspense>
    </>
  );
}
