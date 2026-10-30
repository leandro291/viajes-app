import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { NotificationSettingsPage } from "@/modules/users";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Configuración</h1>
      <Suspense fallback={<PageSkeleton />}>
        <NotificationSettingsPage />
      </Suspense>
    </>
  );
}
