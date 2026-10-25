import { Clock, MapPin, MessageSquare, Users, type LucideIcon } from "lucide-react";

import type { PackageDetailDto } from "../types/package";
import {
  formatLanguages,
  formatPackageDuration,
  formatStartTime,
} from "../utils/package-detail";

export function PackageFacts({ pkg }: { pkg: PackageDetailDto }) {
  const facts: { label: string; value: string; Icon: LucideIcon }[] = [
    { label: "Duración", value: formatPackageDuration(pkg), Icon: Clock },
    { label: "Grupo", value: `Hasta ${pkg.maxGroupSize} personas`, Icon: Users },
    { label: "Idioma", value: formatLanguages(pkg.languages), Icon: MessageSquare },
    {
      label: pkg.kind === "day_tour" && pkg.startTime ? "Hora de salida" : "Salida",
      value:
        pkg.kind === "day_tour" && pkg.startTime
          ? formatStartTime(pkg.startTime)
          : (pkg.meetingPoint ?? pkg.destination.name),
      Icon: MapPin,
    },
  ];

  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3">
      {facts.map(({ label, value, Icon }) => (
        <div key={label} className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-5 shadow-[0_1px_2px_rgba(11,21,19,0.05)]">
          <Icon aria-hidden className="size-6 text-accent" />
          <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">{label}</dt>
          <dd className="font-display text-[19px] font-bold leading-tight">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
