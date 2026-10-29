import { StatusBadge } from "@/components/shared/status-badge";
import { instantToLimaParts } from "@/lib/lima-time";

import type { OperatorItem } from "../types/organizer-manage";
import { ORGANIZER_STATUS_BADGE } from "../utils/organizer-status-badge";
import { OperatorStatusActions } from "./operator-status-actions";

const DATE_FORMAT = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" });

export function OperatorRow({ item }: { item: OperatorItem }) {
  const badge = ORGANIZER_STATUS_BADGE[item.status];

  return (
    <li className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words font-bold text-ink">{item.businessName}</p>
          <StatusBadge status={badge.status} label={badge.label} />
        </div>
        <p className="text-ink-muted">RUC {item.ruc}</p>
        <p className="break-words text-ink-muted">WhatsApp {item.whatsapp}</p>
        <p className="break-words text-ink-muted">
          {item.userName ? `${item.userName} · ${item.email}` : item.email}
        </p>
        <p className="text-ink-muted">
          Alta:{" "}
          <time dateTime={instantToLimaParts(item.createdAt).date}>{DATE_FORMAT.format(item.createdAt)}</time>
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
        <OperatorStatusActions id={item.id} businessName={item.businessName} status={item.status} />
      </div>
    </li>
  );
}
