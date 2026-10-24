import {
  destinationClimateMonths,
  destinationFaqs,
  destinationSights,
  destinations,
} from "../../schema";
import { seedId } from "../helpers";
import { SEED_IMAGES, type SeedImageKey } from "../images";

const img = (key: SeedImageKey) => SEED_IMAGES[key].path;

const base: [slug: string, name: string, region: string, image: SeedImageKey][] = [
  ["cusco", "Cusco", "Cusco", "mp2"],
  ["arequipa", "Arequipa", "Arequipa", "are"],
  ["puno", "Puno", "Puno", "uro"],
  ["amazonia", "Amazonía", "Madre de Dios", "tam"],
  ["ica-paracas", "Ica y Paracas", "Ica", "hua"],
  ["huaraz", "Huaraz", "Áncash", "l69"],
  ["lima", "Lima", "Lima", "lim"],
  ["mancora", "Máncora", "Piura", "man"],
];

export const seedDestinations: (typeof destinations.$inferInsert)[] = base.map(
  ([slug, name, region, image]) => ({
    id: seedId(`destination:${slug}`),
    slug,
    name,
    region,
    heroImageUrl: img(image),
    ...(slug === "cusco" && {
      tagline: "Antigua capital del Imperio inca",
      description:
        "Antigua capital del Imperio inca y puerta de entrada a Machu Picchu. Piedra, mercados y montañas a cada paso.",
      altitudeM: 3399,
      bestSeasonText: "Mayo a septiembre",
      fromLimaText: "~1 h 30 en avión",
    }),
  }),
);

const cuscoId = seedId("destination:cusco");

const cuscoSeasons = [
  "rainy", "rainy", "rainy", "mixed", "dry", "dry", "dry", "dry", "dry", "mixed", "rainy", "rainy",
] as const;

export const seedDestinationClimateMonths: (typeof destinationClimateMonths.$inferInsert)[] =
  cuscoSeasons.map((season, i) => ({ destinationId: cuscoId, month: i + 1, season }));

export const seedDestinationSights: (typeof destinationSights.$inferInsert)[] = (
  [
    ["Machu Picchu", "mp", "La ciudadela inca más famosa del mundo, entre nubes y montañas."],
    ["Valle Sagrado", "pis", "Terrazas de Pisac, mercados y ruinas que siguen vivas."],
    ["Sacsayhuamán", "sac", "Muros colosales de piedra sobre la ciudad, a minutos del centro."],
    ["Vinicunca", "vin", "La montaña de colores, una caminata de altura para madrugadores."],
    ["Aguas Calientes", "agc", "El pueblo a los pies de Machu Picchu, donde llega el tren."],
  ] satisfies [string, SeedImageKey, string][]
).map(([name, image, description], i) => ({
  id: seedId(`destination_sight:cusco:${i + 1}`),
  destinationId: cuscoId,
  name,
  description,
  imageUrl: img(image),
  sortOrder: i + 1,
}));

export const seedDestinationFaqs: (typeof destinationFaqs.$inferInsert)[] = [
  [
    "¿Cuántos días necesito en Cusco?",
    "Lo ideal son 4 o 5 días: uno para aclimatarte, uno para la ciudad, uno para el Valle Sagrado y uno para Machu Picchu.",
  ],
  [
    "¿La entrada a Machu Picchu está incluida?",
    "Sí, en los paquetes que la indican. Reservamos tu horario de ingreso al confirmar la compra.",
  ],
  [
    "¿Puedo cambiar la fecha después de reservar?",
    "Sí, desde Mis reservas, hasta 48 horas antes de la salida y sujeto a disponibilidad.",
  ],
].map(([question, answer], i) => ({
  id: seedId(`destination_faq:cusco:${i + 1}`),
  destinationId: cuscoId,
  question,
  answer,
  sortOrder: i + 1,
}));
