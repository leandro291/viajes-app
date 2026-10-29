import type { OperatorTarget } from "../types/organizer-manage";
import type { OrganizerStatus } from "../types/organizer";

export type StatusChange = { kind: "noop" } | { kind: "change"; ensureRole: boolean };

// Solo `-> active` toca Clerk (D3/D4); mismo estado es no-op (D5).
export function getStatusChange(current: OrganizerStatus, target: OperatorTarget): StatusChange {
  if (current === target) return { kind: "noop" };
  return { kind: "change", ensureRole: target === "active" };
}
