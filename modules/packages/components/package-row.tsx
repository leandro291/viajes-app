import { CalendarX, ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPen } from "@/lib/money";

import type { OwnPackageListItem } from "../services/own-package-service";
import type { OrganizerScope } from "../types/package-manage";
import { formatDuration } from "../utils/package-utils";
import { PackageRowActions } from "./package-row-actions";

const EDIT_HREF = {
  organizer: (id: string) => `/operador/paquetes/${id}/editar`,
  admin: (id: string) => `/admin/paquetes/${id}/editar`,
};

export function PackageRow({
  item,
  panel,
  organizerStatus,
}: {
  item: OwnPackageListItem;
  panel: "organizer" | "admin";
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
          {panel === "admin" && (
            <p className="break-words text-ink-muted">Operador: {item.organizerName}</p>
          )}
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
          render={<Link href={EDIT_HREF[panel](item.id)} />}
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
        <PackageRowActions item={item} panel={panel} organizerStatus={organizerStatus} />
      </div>
    </li>
  );
}
