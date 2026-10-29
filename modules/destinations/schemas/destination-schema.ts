import { z } from "zod";

import { isAllowedImageUrl } from "@/lib/blob/image-url";
import { hasSlugChars } from "@/lib/slug";

import type { Season } from "../types/destination";

export const MAX_SIGHTS = 12;
export const MAX_FAQS = 20;
export const SEASONS = ["dry", "mixed", "rainy"] as const;

export type DestinationInput = {
  name: string;
  region: string;
  heroImageUrl: string;
  tagline: string | null;
  description: string | null;
  altitudeM: number | null;
  bestSeasonText: string | null;
  fromLimaText: string | null;
  howToGetText: string | null;
  tipsText: string | null;
  climate: (Season | null)[]; // 12 posiciones, [0] = enero; todo null o todo definido
  sights: {
    name: string;
    description: string;
    imageUrl: string;
    lat: number | null;
    lng: number | null;
  }[];
  faqs: { question: string; answer: string }[];
};

const IMAGE_MSG = "Usa una imagen subida desde el formulario (https) o una foto del catálogo";
const LAT_MSG = "Ingresa una latitud entre -90 y 90";
const LNG_MSG = "Ingresa una longitud entre -180 y 180";
const CLIMATE_MSG = "Define los 12 meses o déjalos todos sin definir";

const text = (min: number, max: number, msg: string) =>
  z.string({ error: msg }).trim().min(min, msg).max(max, msg);

// Opcional: ausente o vacío -> null.
const optText = (max: number, msg: string) =>
  z
    .string({ error: msg })
    .trim()
    .max(max, msg)
    .nullish()
    .transform((v) => v || null);

const coord = (limit: number, msg: string) =>
  z.number({ error: msg }).min(-limit, msg).max(limit, msg).nullish().transform((v) => v ?? null);

const image = (msg: string) =>
  z.string({ error: msg }).trim().min(1, msg).refine(isAllowedImageUrl, IMAGE_MSG);

const sight = z
  .object({
    name: text(2, 80, "Ingresa un nombre de 2 a 80 caracteres"),
    description: text(10, 500, "Ingresa una descripción de 10 a 500 caracteres"),
    imageUrl: image("Sube una foto del lugar"),
    lat: coord(90, LAT_MSG),
    lng: coord(180, LNG_MSG),
  })
  .superRefine((s, ctx) => {
    if (s.lat !== null && s.lng === null)
      ctx.addIssue({ code: "custom", path: ["lng"], message: "Ingresa también la longitud" });
    if (s.lat === null && s.lng !== null)
      ctx.addIssue({ code: "custom", path: ["lat"], message: "Ingresa también la latitud" });
  });

const faq = z.object({
  question: text(5, 200, "Ingresa una pregunta de 5 a 200 caracteres"),
  answer: text(10, 1000, "Ingresa una respuesta de 10 a 1000 caracteres"),
});

const climate = z
  .array(z.enum(SEASONS, { error: "Estación inválida" }).nullable(), { error: CLIMATE_MSG })
  .length(12, CLIMATE_MSG)
  .refine((c) => c.every((m) => m === null) || c.every((m) => m !== null), CLIMATE_MSG);

// Los campos extra (slug, id) se descartan: z.object los ignora.
export const destinationInputSchema: z.ZodType<DestinationInput, unknown> = z.object({
  name: text(2, 80, "Ingresa un nombre de 2 a 80 caracteres").refine(
    hasSlugChars,
    "El nombre debe incluir al menos una letra o un número",
  ),
  region: text(2, 80, "Ingresa una región de 2 a 80 caracteres"),
  heroImageUrl: image("Sube una foto de portada"),
  tagline: optText(160, "El eslogan admite hasta 160 caracteres"),
  description: optText(2000, "La descripción admite hasta 2000 caracteres"),
  altitudeM: z
    .number({ error: "Ingresa una altitud entre 0 y 9000 metros" })
    .int("Ingresa una altitud entre 0 y 9000 metros")
    .min(0, "Ingresa una altitud entre 0 y 9000 metros")
    .max(9000, "Ingresa una altitud entre 0 y 9000 metros")
    .nullish()
    .transform((v) => v ?? null),
  bestSeasonText: optText(120, "La mejor época admite hasta 120 caracteres"),
  fromLimaText: optText(120, "El texto admite hasta 120 caracteres"),
  howToGetText: optText(1000, "El texto admite hasta 1000 caracteres"),
  tipsText: optText(1000, "Los consejos admiten hasta 1000 caracteres"),
  climate,
  sights: z
    .array(sight, { error: "Lugares inválidos" })
    .max(MAX_SIGHTS, `Máximo ${MAX_SIGHTS} lugares`),
  faqs: z.array(faq, { error: "Preguntas inválidas" }).max(MAX_FAQS, `Máximo ${MAX_FAQS} preguntas`),
});

export const destinationIdSchema = z.uuid();
