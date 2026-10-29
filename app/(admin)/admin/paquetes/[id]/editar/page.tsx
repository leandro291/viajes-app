import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminPackageEditor, packageIdSchema } from "@/modules/packages";

export const metadata: Metadata = { title: "Editar paquete" };

type Params = Promise<{ id: string }>;

// `params` es dato dinámico: se resuelve dentro de Suspense para no bloquear el shell estático.
async function EditPackage({ params }: { params: Params }) {
  const { id } = await params;
  if (!packageIdSchema.safeParse(id).success) notFound();
  return <AdminPackageEditor packageId={id} />;
}

export default function AdminEditarPaquetePage({ params }: { params: Params }) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Editar paquete</h1>
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <EditPackage params={params} />
      </Suspense>
    </>
  );
}
