import { ImageOff, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-role";

import { listAdminDestinations } from "../services/destination-admin-service";
import type { DestinationAdminItem } from "../types/destination-manage";
import { DestinationRowActions } from "./destination-row-actions";

const NEW_HREF = "/admin/destinos/nuevo";

function CreateButton({ label }: { label: string }) {
  return (
    <Button variant="cta" nativeButton={false} render={<Link href={NEW_HREF} />}>
      <Plus aria-hidden="true" />
      {label}
    </Button>
  );
}

function DestinationRow({ item }: { item: DestinationAdminItem }) {
  return (
    <li className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 gap-4">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-ink-muted sm:size-24">
          {item.heroImageUrl ? (
            // alt vacío: el nombre ya está en texto junto a la miniatura.
            <Image src={item.heroImageUrl} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <ImageOff aria-hidden="true" className="size-6" />
          )}
        </div>
        <div className="min-w-0">
          <p className="break-words font-bold text-ink">{item.name}</p>
          <p className="break-words text-ink-muted">{item.region}</p>
          <p className="text-ink-muted">
            {item.packageCount} {item.packageCount === 1 ? "paquete" : "paquetes"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
        <Button
          variant="outline"
          aria-label={`Editar ${item.name}`}
          nativeButton={false}
          render={<Link href={`/admin/destinos/${item.id}/editar`} />}
        >
          Editar
        </Button>
        {item.publishedCount > 0 && (
          <Button
            variant="outline"
            aria-label={`Ver en el sitio: ${item.name}`}
            nativeButton={false}
            render={<Link href={`/destinos/${item.slug}`} />}
          >
            Ver en el sitio
          </Button>
        )}
        <DestinationRowActions id={item.id} name={item.name} />
      </div>
    </li>
  );
}

export async function AdminDestinationsList() {
  await requireRole("admin");
  const items = await listAdminDestinations();

  return (
    <section
      aria-labelledby="destinations-title"
      className="rounded-card bg-surface p-6 shadow-card md:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="destinations-title" className="text-lg font-bold text-ink">
          Destinos
        </h2>
        {items.length > 0 && <CreateButton label="Nuevo destino" />}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-3">
          <p className="text-ink-muted">Aún no hay destinos</p>
          <CreateButton label="Nuevo destino" />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((item) => (
            <DestinationRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
