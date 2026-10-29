import { z } from "zod";

import { discountType, offerKind } from "@/lib/db/schema/enums";
import { limaToInstant } from "@/lib/lima-time";

import type { DiscountType, OfferKind } from "../types/offer";

export const MAX_OFFER_PERCENT = 100;
export const MAX_OFFER_MIN_PEOPLE = 100;

export type OfferInput = {
  packageId: string;
  kind: OfferKind;
  discountType: DiscountType;
  discountValue: number | null;
  minPeople: number | null;
  validUntil: Date | null;
  isActive: boolean;
};
export type OfferUpdateInput = Omit<OfferInput, "packageId">;

const PERCENT_MSG = `Ingresa un porcentaje entero entre 1 y ${MAX_OFFER_PERCENT}`;
const MIN_PEOPLE_MSG = `Ingresa un número entero entre 1 y ${MAX_OFFER_MIN_PEOPLE}`;
const DATE_MSG = "Ingresa una fecha válida";
const PACKAGE_MSG = "Elige un paquete tuyo.";
const KIND_MSG = "Elige un tipo de oferta";
const DISCOUNT_TYPE_MSG = "Elige un tipo de descuento";
const ACTIVE_MSG = "Indica si la oferta está activa";

const fields = {
  kind: z.enum(offerKind.enumValues, { error: KIND_MSG }),
  discountType: z.enum(discountType.enumValues, { error: DISCOUNT_TYPE_MSG }),
  discountValue: z.unknown(),
  minPeople: z.unknown(),
  validUntil: z.unknown(),
  isActive: z.boolean({ error: ACTIVE_MSG }),
};

const isEmpty = (v: unknown) => v === undefined || v === null || v === "";

/** `""`/null/undefined → null; entero en [1, max] → number; cualquier otra cosa → NaN (inválido). */
function toInt(v: unknown, max: number): number | null {
  if (isEmpty(v)) return null;
  if (typeof v !== "number" && typeof v !== "string") return NaN;
  const n = typeof v === "string" ? Number(v.trim()) : v;
  return Number.isInteger(n) && n >= 1 && n <= max ? n : NaN;
}

type Raw = z.infer<z.ZodObject<typeof fields>>;

function parseTerms(
  { discountType: type, discountValue, minPeople, validUntil }: Raw,
  ctx: z.RefinementCtx,
): Pick<OfferInput, "discountValue" | "minPeople" | "validUntil"> {
  const fail = (path: string, message: string) => {
    ctx.addIssue({ code: "custom", message, path: [path] });
  };

  let value: number | null = null;
  if (type === "percent") {
    value = toInt(discountValue, MAX_OFFER_PERCENT);
    if (value === null || Number.isNaN(value)) fail("discountValue", PERCENT_MSG);
  }

  const people = toInt(minPeople, MAX_OFFER_MIN_PEOPLE);
  if (Number.isNaN(people)) fail("minPeople", MIN_PEOPLE_MSG);

  let until: Date | null = null;
  if (!isEmpty(validUntil)) {
    // `limaToInstant` rechaza fechas inexistentes (2026-02-30).
    until = typeof validUntil === "string" ? limaToInstant(validUntil, "23:59") : null;
    if (!until) fail("validUntil", DATE_MSG);
  }

  return { discountValue: value, minPeople: people, validUntil: until };
}

export const offerInputSchema: z.ZodType<OfferInput, unknown> = z
  .object({ packageId: z.uuid({ error: PACKAGE_MSG }), ...fields })
  .transform(({ packageId, kind, discountType: type, isActive, ...raw }, ctx) => ({
    packageId,
    kind,
    discountType: type,
    isActive,
    ...parseTerms({ kind, discountType: type, isActive, ...raw }, ctx),
  }));

export const offerUpdateSchema: z.ZodType<OfferUpdateInput, unknown> = z
  .object(fields)
  .transform(({ kind, discountType: type, isActive, ...raw }, ctx) => ({
    kind,
    discountType: type,
    isActive,
    ...parseTerms({ kind, discountType: type, isActive, ...raw }, ctx),
  }));

export const offerIdSchema = z.uuid();
