import { Circle, CircleCheck, CircleX, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"

export type BookingStatusKey = "confirmed" | "pending" | "cancelled" | "neutral"

const STATUS = {
  confirmed: {
    label: "Confirmada",
    Icon: CircleCheck,
    className: "bg-status-confirmed-bg text-status-confirmed",
  },
  pending: {
    label: "Pendiente",
    Icon: Clock,
    className: "bg-status-pending-bg text-status-pending",
  },
  cancelled: {
    label: "Cancelada",
    Icon: CircleX,
    className: "bg-status-cancelled-bg text-status-cancelled",
  },
  neutral: {
    label: "Neutro",
    Icon: Circle,
    className: "bg-status-neutral-bg text-status-neutral",
  },
} as const satisfies Record<
  BookingStatusKey,
  { label: string; Icon: typeof Circle; className: string }
>

export function StatusBadge({
  status,
  label,
}: {
  status: BookingStatusKey
  label?: string
}) {
  const { label: defaultLabel, Icon, className } = STATUS[status]
  return (
    <Badge className={className}>
      <Icon aria-hidden strokeWidth={2.5} />
      {label ?? defaultLabel}
    </Badge>
  )
}
