import { z } from "zod";

import { MAX_TRAVELERS } from "../schemas/checkout-schema";

export type CheckoutParams = {
  salida?: string;
  viajeros?: number;
  oferta?: string;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const viajerosSchema = z
  .string()
  .regex(/^\d{1,2}$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(MAX_TRAVELERS));

/** Lee `?salida=&viajeros=&oferta=`; lo inválido se descarta sin lanzar. */
export function parseCheckoutParams(raw: RawParams): CheckoutParams {
  const out: CheckoutParams = {};
  const salida = z.uuid().safeParse(first(raw.salida));
  if (salida.success) out.salida = salida.data;
  const viajeros = viajerosSchema.safeParse(first(raw.viajeros));
  if (viajeros.success) out.viajeros = viajeros.data;
  const oferta = z.uuid().safeParse(first(raw.oferta));
  if (oferta.success) out.oferta = oferta.data;
  return out;
}
