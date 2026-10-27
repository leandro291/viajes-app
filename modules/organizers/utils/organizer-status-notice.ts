import type { organizerStatus } from "@/lib/db/schema/enums";

type OrganizerStatus = (typeof organizerStatus.enumValues)[number];

export type OrganizerNotice = {
  tone: "pending" | "suspended";
  title: string;
  description: string;
};

const NOTICES: Partial<Record<OrganizerStatus, OrganizerNotice>> = {
  pending: {
    tone: "pending",
    title: "Tu cuenta está pendiente de aprobación",
    description:
      "Nuestro equipo está revisando tus datos. Mientras tanto puedes explorar el panel; te avisaremos cuando esté activa.",
  },
  suspended: {
    tone: "suspended",
    title: "Tu cuenta está suspendida",
    description:
      "Tu cuenta de operador está suspendida. Contacta a nuestro equipo para resolverlo.",
  },
};

export function getOrganizerNotice(
  status: OrganizerStatus | null | undefined,
): OrganizerNotice | null {
  return (status && NOTICES[status]) || null;
}
