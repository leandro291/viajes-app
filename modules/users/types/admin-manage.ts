export type AdminItem = {
  id: string;
  email: string;
  name: string | null; // "Nombre Apellido" o null
  role: "admin" | "super_admin";
  createdAt: Date;
};

export type AdminErrorCode =
  | "NOT_FOUND"
  | "EMAIL_NOT_FOUND"
  | "INVALID_INPUT"
  | "PROTECTED"
  | "CLERK_FAILED"
  | "UNKNOWN";

export type AdminResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: AdminErrorCode; message: string; fieldErrors?: Record<string, string> };

export const ADMIN_MESSAGES: Record<AdminErrorCode, string> = {
  NOT_FOUND: "No encontramos a ese usuario.",
  EMAIL_NOT_FOUND: "No encontramos una cuenta con ese correo. La persona debe registrarse primero.",
  INVALID_INPUT: "Revisa los datos e inténtalo de nuevo.",
  PROTECTED: "No se puede modificar a un super administrador.",
  CLERK_FAILED: "No pudimos actualizar el rol en Clerk. No se cambió nada; inténtalo de nuevo.",
  UNKNOWN: "No pudimos guardar los cambios. Inténtalo de nuevo.",
};

// Parte pura: la importan también los componentes cliente (sin Clerk ni BD).
export function adminFail(
  code: AdminErrorCode,
  fieldErrors?: Record<string, string>,
): Extract<AdminResult, { ok: false }> {
  return { ok: false, code, message: ADMIN_MESSAGES[code], ...(fieldErrors && { fieldErrors }) };
}
