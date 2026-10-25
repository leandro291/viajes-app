import type { PackageCardDto } from "../types/package";

export function isDayTour(p: Pick<PackageCardDto, "kind" | "durationDays">): boolean {
  return p.kind === "day_tour" || p.durationDays === 1;
}

export function formatDuration(days: number): string {
  return days === 1 ? "1 día" : `${days} días`;
}
