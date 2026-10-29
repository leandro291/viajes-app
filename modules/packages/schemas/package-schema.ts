import { z } from "zod";

import { isAllowedImageUrl } from "@/lib/blob/image-url";

export { IMAGE_URL_RE, isAllowedImageUrl } from "@/lib/blob/image-url";

export const PACKAGE_LANGUAGES = ["es", "en"] as const;

export type PackageInput = {
  kind: "package" | "day_tour";
  title: string;
  blurb: string;
  description: string;
  destinationId: string;
  categoryIds: string[];
  priceCents: number;
  durationDays: number;
  nights: number;
  durationHours: number | null;
  startTime: string | null;
  maxGroupSize: number;
  languages: ("es" | "en")[];
  meetingPoint: string | null;
  meetingLat: number | null;
  meetingLng: number | null;
  coverImageUrl: string;
  images: { url: string; alt: string | null; credit: string | null }[];
  itinerary: {
    title: string;
    description: string;
    place: string;
    transportLeg: string | null;
    imageUrl: string | null;
    lat: number | null;
    lng: number | null;
  }[];
  included: string[];
  excluded: string[];
  status: "draft" | "published";
};

const IMAGE_MSG = "Usa una imagen subida desde el formulario (https) o una foto del catálogo";
const LAT_MSG = "Ingresa una latitud entre -90 y 90";
const LNG_MSG = "Ingresa una longitud entre -180 y 180";
const ITEM_MSG = "Cada ítem debe tener entre 2 y 150 caracteres";

const text = (min: number, max: number, msg: string) =>
  z.string({ error: msg }).trim().min(min, msg).max(max, msg);

const int = (min: number, max: number, msg: string) =>
  z.number({ error: msg }).int(msg).min(min, msg).max(max, msg);

const unique = (items: readonly string[]) => new Set(items).size === items.length;

// Opcional: ausente o vacío -> null.
const optText = (max: number, msg: string) =>
  z
    .string({ error: msg })
    .trim()
    .max(max, msg)
    .nullish()
    .transform((v) => v || null);

const optImageUrl = z
  .string({ error: IMAGE_MSG })
  .trim()
  .nullish()
  .transform((v) => v || null)
  .pipe(z.string().refine(isAllowedImageUrl, IMAGE_MSG).nullable());

const coord = (limit: number, msg: string) =>
  z.number({ error: msg }).min(-limit, msg).max(limit, msg).nullish().transform((v) => v ?? null);

// lat y lng juntas o ambas vacías: el error va en el campo que falta.
function checkPair(
  ctx: z.RefinementCtx,
  lat: number | null,
  lng: number | null,
  latKey: string,
  lngKey: string,
) {
  if (lat !== null && lng === null)
    ctx.addIssue({ code: "custom", path: [lngKey], message: "Ingresa también la longitud" });
  if (lat === null && lng !== null)
    ctx.addIssue({ code: "custom", path: [latKey], message: "Ingresa también la latitud" });
}

const itineraryDay = z
  .object({
    title: text(3, 100, "Ingresa un título de 3 a 100 caracteres"),
    description: text(10, 1500, "Ingresa una descripción de 10 a 1500 caracteres"),
    place: text(2, 100, "Ingresa un lugar de 2 a 100 caracteres"),
    transportLeg: optText(100, "El traslado admite hasta 100 caracteres"),
    imageUrl: optImageUrl,
    lat: coord(90, LAT_MSG),
    lng: coord(180, LNG_MSG),
  })
  .superRefine((d, ctx) => checkPair(ctx, d.lat, d.lng, "lat", "lng"));

export const MAX_GALLERY_IMAGES = 12;

const galleryImage = z.object({
  url: z.string({ error: IMAGE_MSG }).trim().refine(isAllowedImageUrl, IMAGE_MSG),
  alt: optText(200, "El texto alternativo admite hasta 200 caracteres"),
  credit: optText(200, "El crédito admite hasta 200 caracteres"),
});

const inclusions = z.array(text(2, 150, ITEM_MSG), { error: ITEM_MSG }).max(30, "Máximo 30 ítems");

const common = z.object({
  title: text(3, 100, "Ingresa un título de 3 a 100 caracteres"),
  blurb: text(10, 200, "Ingresa un resumen de 10 a 200 caracteres"),
  description: text(30, 5000, "Ingresa una descripción de 30 a 5000 caracteres"),
  destinationId: z.uuid({ error: "Elige un destino" }),
  categoryIds: z
    .array(z.uuid({ error: "Categoría inválida" }), { error: "Elige al menos una categoría" })
    .min(1, "Elige al menos una categoría")
    .max(10, "Elige hasta 10 categorías")
    .refine(unique, "No repitas categorías"),
  priceCents: int(100, 10_000_000, "Ingresa un precio entre S/ 1 y S/ 100 000"),
  maxGroupSize: int(1, 100, "Ingresa un cupo entre 1 y 100"),
  languages: z
    .array(z.enum(PACKAGE_LANGUAGES, { error: "Idioma inválido" }), {
      error: "Elige al menos un idioma",
    })
    .min(1, "Elige al menos un idioma")
    .refine(unique, "No repitas idiomas"),
  meetingPoint: optText(200, "El punto de encuentro admite hasta 200 caracteres"),
  meetingLat: coord(90, LAT_MSG),
  meetingLng: coord(180, LNG_MSG),
  coverImageUrl: z
    .string({ error: "Sube una imagen de portada" })
    .trim()
    .min(1, "Sube una imagen de portada")
    .refine(isAllowedImageUrl, IMAGE_MSG),
  images: z.array(galleryImage, { error: "Galería inválida" }).max(MAX_GALLERY_IMAGES, `Máximo ${MAX_GALLERY_IMAGES} imágenes`),
  itinerary: z
    .array(itineraryDay, { error: "Agrega al menos un día al itinerario" })
    .min(1, "Agrega al menos un día al itinerario"),
  included: inclusions,
  excluded: inclusions,
  status: z.enum(["draft", "published"], { error: "Estado inválido" }),
});

const KIND_MSG = "Elige el tipo: paquete o tour de un día";

// Refinements entre campos y transform final de normalización por `kind`. Zod 4: los
// refinements de objeto corren solo si no hay errores de campo (segunda pasada).
export const packageInputSchema: z.ZodType<PackageInput, unknown> = z
  .discriminatedUnion(
    "kind",
    [
      common.extend({
        kind: z.literal("package"),
        durationDays: int(1, 30, "Ingresa entre 1 y 30 días"),
        nights: int(0, 30, "Ingresa entre 0 y 30 noches"),
      }),
      common.extend({
        kind: z.literal("day_tour"),
        durationHours: int(1, 24, "Ingresa entre 1 y 24 horas"),
        startTime: z
          .string({ error: "Ingresa la hora de inicio, ej. 08:30" })
          .trim()
          .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Ingresa la hora de inicio, ej. 08:30"),
      }),
    ],
    { error: KIND_MSG },
  )
  .superRefine((v, ctx) => {
    checkPair(ctx, v.meetingLat, v.meetingLng, "meetingLat", "meetingLng");
    const maxDays = v.kind === "package" ? v.durationDays : 1;
    if (v.kind === "package" && v.nights > v.durationDays)
      ctx.addIssue({
        code: "custom",
        path: ["nights"],
        message: `Las noches no pueden superar los días (máximo ${v.durationDays})`,
      });
    if (v.itinerary.length > maxDays)
      ctx.addIssue({
        code: "custom",
        path: [v.kind === "package" ? "durationDays" : "itinerary"],
        message: `El itinerario no puede tener más de ${maxDays} ${maxDays === 1 ? "día" : "días"} (tiene ${v.itinerary.length})`,
      });
  })
  .transform(
    (v): PackageInput =>
      v.kind === "package"
        ? { ...v, durationHours: null, startTime: null }
        : { ...v, durationDays: 1, nights: 0 },
  );

export const packageIdSchema = z.uuid();
export const packageStatusSchema = z.enum(["draft", "published"]);
