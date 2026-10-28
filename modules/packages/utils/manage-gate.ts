import type { ManageErrorCode, ManageResult, OrganizerScope } from "../types/package-manage";

export function getWriteBlock(
  status: OrganizerScope["status"],
  opts: { publishing: boolean },
): "ORGANIZER_SUSPENDED" | "ORGANIZER_PENDING" | null {
  if (status === "suspended") return "ORGANIZER_SUSPENDED";
  if (status === "pending" && opts.publishing) return "ORGANIZER_PENDING";
  return null;
}

export const MANAGE_MESSAGES: Record<ManageErrorCode, string> = {
  ORGANIZER_SUSPENDED: "Tu cuenta está suspendida: no puedes modificar paquetes.",
  ORGANIZER_PENDING:
    "Tu cuenta debe estar activa para publicar. Guarda como borrador mientras tanto.",
  NOT_FOUND: "No encontramos ese elemento.",
  NO_ORGANIZER: "Aún no tienes un perfil de operador.",
  INVALID_INPUT: "Revisa los campos marcados.",
  HAS_BOOKINGS:
    "Este paquete tiene reservas, no se puede eliminar. Pásalo a borrador para ocultarlo.",
  HAS_DEPARTURES:
    "Este paquete tiene salidas, no se puede eliminar. Pásalo a borrador para ocultarlo.",
  HAS_OFFERS:
    "Este paquete tiene ofertas, no se puede eliminar. Pásalo a borrador para ocultarlo.",
  HAS_DEPENDENCIES:
    "Este paquete tiene reservas, salidas u ofertas, no se puede eliminar. Pásalo a borrador para ocultarlo.",
  UNKNOWN: "No pudimos guardar los cambios. Inténtalo de nuevo.",
};

export function manageFail(
  code: ManageErrorCode,
  fieldErrors?: Record<string, string>,
): Extract<ManageResult, { ok: false }> {
  return { ok: false, code, message: MANAGE_MESSAGES[code], ...(fieldErrors && { fieldErrors }) };
}
