import { CalendarX, ImageOff, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPen } from "@/lib/money";
import { getCurrentOrganizer } from "@/modules/organizers";

import { listOwnPackages, type OwnPackageListItem } from "../services/own-package-service";
import type { OrganizerScope } from "../types/package-manage";
import { formatDuration } from "../utils/package-utils";
import { PackageRowActions } from "./package-row-actions";

const NEW_HREF = "/operador/paquetes/nuevo";

function CreateButton({
  label,
  variant,
  suspended,
  className,
}: {
  label: string;
  variant: "cta" | "outline";
  suspended: boolean;
  className?: string;
}) {
  const icon = <Plus aria-hidden="true" />;
  // Suspendido: botón deshabilitado en vez de link (no puede escribir).
  if (suspended) {
    return (
      <Button variant={variant} disabled className={className}>
        {icon}
        {label}
      </Button>
    );
  }
  return (
    <Button
      variant={variant}
      className={className}
      nativeButton={false}
      render={<Link href={NEW_HREF} />}
    >
      {icon}
      {label}
    </Button>
  );
}

function PackageRow({
  item,
  organizerStatus,
}: {
  item: OwnPackageListItem;
  organizerStatus: OrganizerScope["status"];
}) {
  const isPublished = item.status === "published";

  return (
    <li className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 gap-4">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-ink-muted sm:size-24">
          {item.coverImageUrl ? (
            <Image
              src={item.coverImageUrl}
              alt={`Portada de ${item.title}`}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <ImageOff aria-hidden="true" className="size-6" />
          )}
        </div>
        <div className="min-w-0">
          <p className="break-words font-bold text-ink">{item.title}</p>
          <p className="break-words text-ink-muted">{item.destinationName}</p>
          <p className="text-ink-muted">
            {item.kind === "day_tour" ? "Tour de un día" : "Paquete"} ·{" "}
            {formatDuration(item.durationDays)} · {formatPen(item.priceCents)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge
              status={isPublished ? "confirmed" : "neutral"}
              label={isPublished ? "Publicado" : "Borrador"}
            />
            {isPublished && item.departureCount === 0 && (
              <Badge variant="outline">
                <CalendarX aria-hidden="true" />
                Sin salidas
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/operador/paquetes/${item.id}/editar`} />}
        >
          Editar
        </Button>
        {isPublished && (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/paquetes/${item.slug}`} />}
          >
            Ver en el sitio
          </Button>
        )}
        <PackageRowActions item={item} organizerStatus={organizerStatus} />
      </div>
    </li>
  );
}

export async function OwnPackagesList() {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return (
      <section
        aria-labelledby="packages-no-profile"
        className="rounded-card bg-surface p-6 shadow-card md:p-8"
      >
        <h2 id="packages-no-profile" className="text-lg font-bold text-ink">
          Aún no tienes un perfil de operador
        </h2>
        <p className="mt-2 text-ink-muted">
          Cuando tu cuenta de operador esté creada, aquí podrás gestionar tus
          paquetes.
        </p>
      </section>
    );
  }

  const items = await listOwnPackages(organizer.id);
  const suspended = organizer.status === "suspended";
  const empty = items.length === 0;

  return (
    <section
      aria-labelledby="packages-title"
      className="rounded-card bg-surface p-6 shadow-card md:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="packages-title" className="text-lg font-bold text-ink">
          Tus paquetes
        </h2>
        <CreateButton
          label="Nuevo paquete"
          variant={empty ? "outline" : "cta"}
          suspended={suspended}
        />
      </div>

      {empty ? (
        <div className="mt-6 flex flex-col items-start gap-3">
          <p className="text-ink-muted">Aún no tienes paquetes</p>
          <CreateButton label="Crear paquete" variant="cta" suspended={suspended} />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((item) => (
            <PackageRow key={item.id} item={item} organizerStatus={organizer.status} />
          ))}
        </ul>
      )}
    </section>
  );
}
