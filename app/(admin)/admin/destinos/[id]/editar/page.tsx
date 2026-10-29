import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { DestinationEditor, destinationIdSchema } from "@/modules/destinations";

export const metadata: Metadata = { title: "Editar destino" };

type Params = Promise<{ id: string }>;

// `params` es dato dinámico: se resuelve dentro de Suspense para no bloquear el shell estático.
async function EditDestination({ params }: { params: Params }) {
  const { id } = await params;
  if (!destinationIdSchema.safeParse(id).success) notFound();
  return <DestinationEditor destinationId={id} />;
}

export default function EditarDestinoPage({ params }: { params: Params }) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Editar destino</h1>
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <EditDestination params={params} />
      </Suspense>
    </>
  );
}
