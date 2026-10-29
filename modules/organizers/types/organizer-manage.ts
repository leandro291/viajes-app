import type { OrganizerStatus } from "./organizer";

export type OperatorTarget = "active" | "suspended";

export type OperatorItem = {
  id: string;
  businessName: string;
  ruc: string;
  whatsapp: string;
  status: OrganizerStatus;
  createdAt: Date;
  email: string;
  userName: string | null; // "Nombre Apellido" o null
};

export type OperatorErrorCode =
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "CLERK_FAILED"
  | "PARTIAL"
  | "UNKNOWN";

export type OperatorResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: OperatorErrorCode; message: string; fieldErrors?: Record<string, string> };

export const OPERATOR_MESSAGES: Record<OperatorErrorCode, string> = {
  NOT_FOUND: "No encontramos a ese operador.",
  INVALID_INPUT: "Revisa los datos e inténtalo de nuevo.",
  CLERK_FAILED: "No pudimos asignar el rol en Clerk. No se cambió nada; inténtalo de nuevo.",
  PARTIAL: "El rol se asignó, pero no se guardó el estado. Inténtalo de nuevo.",
  UNKNOWN: "No pudimos guardar los cambios. Inténtalo de nuevo.",
};

// Parte pura: la importan también los componentes cliente (sin Clerk ni BD).
export function operatorFail(
  code: OperatorErrorCode,
  fieldErrors?: Record<string, string>,
): Extract<OperatorResult, { ok: false }> {
  return { ok: false, code, message: OPERATOR_MESSAGES[code], ...(fieldErrors && { fieldErrors }) };
}
