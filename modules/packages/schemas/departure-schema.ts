import { z } from "zod";

import { departureStatus } from "@/lib/db/schema/enums";

import type { DepartureStatus } from "../utils/departure-rules";
import { limaToInstant } from "../utils/departure-time";

export const MAX_DEPARTURE_CAPACITY = 100;

export type DepartureInput = {
  packageId: string;
  startsAt: Date;
  capacity: number;
  guideId: string | null;
};
export type DepartureUpdateInput = Omit<DepartureInput, "packageId"> & { status: DepartureStatus };

const DATE_MSG = "Ingresa una fecha válida";
const TIME_MSG = "Ingresa una hora válida entre 00:00 y 23:59";
const CAPACITY_MSG = `Ingresa una capacidad entre 1 y ${MAX_DEPARTURE_CAPACITY}`;
const PACKAGE_MSG = "Elige un paquete tuyo.";
const GUIDE_MSG = "Elige una guía tuya.";
const STATUS_MSG = "Elige un estado válido";

const fields = {
  date: z.string({ error: DATE_MSG }).regex(/^\d{4}-\d{2}-\d{2}$/, DATE_MSG),
  time: z.string({ error: TIME_MSG }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, TIME_MSG),
  capacity: z.coerce
    .number({ error: CAPACITY_MSG })
    .int(CAPACITY_MSG)
    .min(1, CAPACITY_MSG)
    .max(MAX_DEPARTURE_CAPACITY, CAPACITY_MSG),
  guideId: z
    .string({ error: GUIDE_MSG })
    .nullable()
    .refine((v) => !v || z.uuid().safeParse(v).success, GUIDE_MSG)
    .transform((v) => v || null),
};

type Raw = { date: string; time: string };

// `limaToInstant` rechaza fechas inexistentes (2026-02-30) que el regex deja pasar.
function toStartsAt({ date, time }: Raw, ctx: z.RefinementCtx): Date {
  const startsAt = limaToInstant(date, time);
  if (!startsAt) {
    ctx.addIssue({ code: "custom", message: DATE_MSG, path: ["date"] });
    return z.NEVER;
  }
  return startsAt;
}

export const departureInputSchema: z.ZodType<DepartureInput, unknown> = z
  .object({ packageId: z.uuid({ error: PACKAGE_MSG }), ...fields })
  .transform(({ packageId, capacity, guideId, ...raw }, ctx) => ({
    packageId,
    startsAt: toStartsAt(raw, ctx),
    capacity,
    guideId,
  }));

export const departureUpdateSchema: z.ZodType<DepartureUpdateInput, unknown> = z
  .object({ ...fields, status: z.enum(departureStatus.enumValues, { error: STATUS_MSG }) })
  .transform(({ capacity, guideId, status, ...raw }, ctx) => ({
    startsAt: toStartsAt(raw, ctx),
    capacity,
    guideId,
    status,
  }));

export const departureIdSchema = z.uuid();
