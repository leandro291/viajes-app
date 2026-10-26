import { z } from "zod";

import type { CheckoutField } from "../types/checkout";

export const MAX_TRAVELERS = 20;

const MSG = {
  link: "Este enlace de reserva no es válido",
  firstRequired: "Ingresa tu nombre",
  lastRequired: "Ingresa tu apellido",
  nameInvalid: "Usa solo letras, espacios, apóstrofes, puntos y guiones",
  nameTooLong: "Máximo 60 caracteres",
  emailRequired: "Ingresa tu correo",
  emailInvalid: "Ingresa un correo válido",
  phoneRequired: "Ingresa tu celular",
  phoneInvalid: "Ingresa un celular válido (7 a 15 dígitos)",
  docType: "Elige un tipo de documento",
  docRequired: "Ingresa tu número de documento",
  dni: "El DNI debe tener 8 dígitos",
  docOther: "Usa de 6 a 12 letras o números, sin símbolos",
  terms: "Debes aceptar los términos y condiciones",
} as const;

const NAME_CHARS = /^[\p{L}\p{M}][\p{L}\p{M} '.-]*$/u;

// Espacios colapsados en el borde, antes de validar (D10).
const name = (required: string) =>
  z
    .string({ error: required })
    .transform((v) => v.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, required)
        .max(60, MSG.nameTooLong)
        .regex(NAME_CHARS, MSG.nameInvalid),
    );

// FormData entrega texto: "2" -> 2; lo no numérico queda como NaN y se rechaza.
const travelers = z
  .unknown()
  .transform((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v))
  .pipe(
    z
      .number({ error: MSG.link })
      .int(MSG.link)
      .min(1, MSG.link)
      .max(MAX_TRAVELERS, MSG.link),
  );

// El checkbox de Base UI envía "on" al marcarse; ausente = no aceptó.
const terms = z.unknown().transform((v, ctx) => {
  if (v === "on" || v === "true" || v === true) return true as const;
  ctx.addIssue({ code: "custom", message: MSG.terms });
  return z.NEVER;
});

// Zod descarta por defecto las claves desconocidas (AC7): precio, total, etc. no pasan.
export const checkoutSchema = z
  .object({
    salida: z.uuid({ error: MSG.link }),
    viajeros: travelers,
    oferta: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.uuid({ error: MSG.link }).optional(),
    ),
    firstName: name(MSG.firstRequired),
    lastName: name(MSG.lastRequired),
    email: z
      .string({ error: MSG.emailRequired })
      .trim()
      .toLowerCase()
      .min(1, MSG.emailRequired)
      .max(254, MSG.emailInvalid)
      .pipe(z.email(MSG.emailInvalid)),
    phone: z
      .string({ error: MSG.phoneRequired })
      .transform((v) => v.replace(/[\s\-()]/g, ""))
      .pipe(
        z
          .string()
          .min(1, MSG.phoneRequired)
          .regex(/^\+?\d{7,15}$/, MSG.phoneInvalid),
      ),
    docType: z.enum(["dni", "passport", "foreign_id"], { error: MSG.docType }),
    docNumber: z
      .string({ error: MSG.docRequired })
      .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
      .pipe(z.string().min(1, MSG.docRequired)),
    terms,
  })
  .superRefine((data, ctx) => {
    // Formato según el tipo (D10); si ya falló docNumber vacío, no se duplica el aviso.
    const ok =
      data.docType === "dni"
        ? /^\d{8}$/.test(data.docNumber)
        : /^[A-Z0-9]{6,12}$/.test(data.docNumber);
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        path: ["docNumber"],
        message: data.docType === "dni" ? MSG.dni : MSG.docOther,
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

const FIELDS = [
  "salida",
  "viajeros",
  "oferta",
  "firstName",
  "lastName",
  "email",
  "phone",
  "docType",
  "docNumber",
  "terms",
] as const;
const LINK_FIELDS = new Set<string>(["salida", "viajeros", "oferta"]);

export function parseCheckoutForm(formData: FormData):
  | { ok: true; data: CheckoutInput }
  | {
      ok: false;
      fieldErrors: Partial<Record<CheckoutField, string>>;
      linkInvalid: boolean;
    } {
  const raw = Object.fromEntries(FIELDS.map((f) => [f, formData.get(f)]));
  const result = checkoutSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Partial<Record<CheckoutField, string>> = {};
  let linkInvalid = false;
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    if (LINK_FIELDS.has(key)) linkInvalid = true;
    else if (!(key in fieldErrors))
      fieldErrors[key as CheckoutField] = issue.message;
  }
  return { ok: false, fieldErrors, linkInvalid };
}
