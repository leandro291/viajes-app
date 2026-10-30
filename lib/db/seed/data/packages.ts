import {
  categories as categoriesTable,
  packageCategories as packageCategoriesTable,
  packages as packagesTable,
} from "../../schema";
import { seedId, soles } from "../helpers";
import { SEED_IMAGES, type SeedImageKey } from "../images";

export const seedCategories: (typeof categoriesTable.$inferInsert)[] = [
  { slug: "aventura", name: "Aventura" },
  { slug: "cultura", name: "Cultura" },
  { slug: "naturaleza", name: "Naturaleza" },
  { slug: "gastronomia", name: "Gastronomía" },
  { slug: "playas", name: "Playas" },
].map((c) => ({ id: seedId(`category:${c.slug}`), ...c }));

type PackageRow = {
  slug: string;
  title: string;
  destination: string;
  kind: "package" | "day_tour";
  days: number;
  hours?: number;
  startTime?: string;
  price: number;
  img: SeedImageKey;
  categories: string[];
  blurb: string;
  description?: string;
  languages?: string[];
};

const rows: PackageRow[] = [
  {
    slug: "machu-picchu-magico",
    title: "Machu Picchu Mágico",
    destination: "cusco",
    kind: "package",
    days: 4,
    price: 1290,
    img: "mp2",
    categories: ["cultura", "aventura"],
    blurb: "Tren panorámico a Aguas Calientes, entrada a la ciudadela y guía en español.",
    description:
      "Cuatro días entre Cusco, el Valle Sagrado y la ciudadela, con tren panorámico y guía en español. Recorres la ciudad imperial, caminas entre las terrazas del Valle Sagrado y subes en tren hasta Aguas Calientes para entrar a Machu Picchu al día siguiente, con tiempo para fotos y sin apuros. Cada traslado y entrada está coordinado por nosotros.",
    languages: ["es", "en"],
  },
  {
    slug: "cusco-valle-sagrado",
    title: "Cusco y Valle Sagrado",
    destination: "cusco",
    kind: "package",
    days: 5,
    price: 1580,
    img: "cus",
    categories: ["cultura"],
    blurb: "Ollantaytambo, Pisac, Moray y la ciudad imperial, con hotel céntrico.",
  },
  {
    slug: "montana-de-colores",
    title: "Montaña de Colores",
    destination: "cusco",
    kind: "day_tour",
    days: 1,
    hours: 14,
    startTime: "04:00",
    price: 120,
    img: "vin",
    categories: ["aventura"],
    blurb: "Salida de madrugada, desayuno incluido y caminata guiada a Vinicunca.",
  },
  {
    slug: "titicaca-islas-uros",
    title: "Titicaca e Islas Uros",
    destination: "puno",
    kind: "package",
    days: 3,
    price: 890,
    img: "uro",
    categories: ["cultura", "naturaleza"],
    blurb: "Navega entre islas flotantes y duerme con una familia en Amantaní.",
  },
  {
    slug: "canon-del-colca",
    title: "Cañón del Colca",
    destination: "arequipa",
    kind: "package",
    days: 3,
    price: 740,
    img: "col",
    categories: ["aventura", "naturaleza"],
    blurb: "Mirador de la Cruz del Cóndor y aguas termales al final del día.",
  },
  {
    slug: "amazonia-tambopata",
    title: "Amazonía en Tambopata",
    destination: "amazonia",
    kind: "package",
    days: 4,
    price: 1650,
    img: "tam",
    categories: ["naturaleza"],
    blurb: "Lodge en plena selva, caminatas nocturnas y collpa de guacamayos.",
  },
  {
    slug: "paracas-huacachina",
    title: "Paracas y Huacachina",
    destination: "ica-paracas",
    kind: "package",
    days: 2,
    price: 520,
    img: "hua",
    categories: ["naturaleza", "playas"],
    blurb: "Islas Ballestas en lancha y sandboard al atardecer en las dunas.",
  },
  {
    slug: "lima-sabores-y-cultura",
    title: "Lima: Sabores y Cultura",
    destination: "lima",
    kind: "package",
    days: 3,
    price: 690,
    img: "lim",
    categories: ["gastronomia", "cultura"],
    blurb: "Centro histórico, Barranco y una clase de cocina de ceviche.",
  },
  {
    slug: "mancora-sol-y-playa",
    title: "Máncora, sol y playa",
    destination: "mancora",
    kind: "package",
    days: 4,
    price: 980,
    img: "man",
    categories: ["playas"],
    blurb: "Hotel frente al mar, paseo en bote y tiempo libre para surfear.",
  },
  {
    slug: "laguna-69-huaraz",
    title: "Laguna 69 y Huaraz",
    destination: "huaraz",
    kind: "package",
    days: 4,
    price: 860,
    img: "l69",
    categories: ["aventura", "naturaleza"],
    blurb: "Caminata a la laguna turquesa dentro del Parque Nacional Huascarán.",
  },
  {
    slug: "sabores-del-peru",
    title: "Sabores del Perú",
    destination: "lima",
    kind: "package",
    days: 5,
    price: 1120,
    img: "are",
    categories: ["gastronomia"],
    blurb: "Mercados, picanterías y cocina novoandina en dos ciudades.",
  },
  {
    slug: "islas-ballestas",
    title: "Islas Ballestas",
    destination: "ica-paracas",
    kind: "day_tour",
    days: 1,
    hours: 2,
    startTime: "08:00",
    price: 95,
    img: "bal",
    categories: ["naturaleza"],
    blurb: "Lobos marinos, pingüinos de Humboldt y el Candelabro desde el bote.",
  },
  {
    slug: "machu-picchu-en-un-dia",
    title: "Machu Picchu en un día",
    destination: "cusco",
    kind: "day_tour",
    days: 1,
    hours: 16,
    startTime: "04:30",
    price: 980,
    img: "mp2",
    categories: ["cultura", "aventura"],
    blurb: "Tren ida y vuelta, bus de subida, entrada y guía.",
  },
  {
    slug: "valle-sagrado-completo",
    title: "Valle Sagrado completo",
    destination: "cusco",
    kind: "day_tour",
    days: 1,
    hours: 10,
    startTime: "07:30",
    price: 150,
    img: "pis",
    categories: ["cultura"],
    blurb: "Pisac, Ollantaytambo y almuerzo buffet en Urubamba.",
  },
  {
    slug: "city-tour-sacsayhuaman",
    title: "City tour y Sacsayhuamán",
    destination: "cusco",
    kind: "day_tour",
    days: 1,
    hours: 5,
    startTime: "13:30",
    price: 70,
    img: "sac",
    categories: ["cultura"],
    blurb: "Qorikancha, Catedral y los cuatro sitios arqueológicos cercanos.",
  },
  {
    slug: "buggy-sandboard-huacachina",
    title: "Buggy y sandboard en Huacachina",
    destination: "ica-paracas",
    kind: "day_tour",
    days: 1,
    hours: 2,
    startTime: "16:00",
    price: 85,
    img: "hua",
    categories: ["aventura"],
    blurb: "Dunas al atardecer, tabla incluida y fotos en el oasis.",
  },
  {
    slug: "islas-uros-medio-dia",
    title: "Islas Uros medio día",
    destination: "puno",
    kind: "day_tour",
    days: 1,
    hours: 3,
    startTime: "09:00",
    price: 60,
    img: "uro",
    categories: ["cultura", "naturaleza"],
    blurb: "Bote por el Titicaca y visita a una isla flotante de totora.",
  },
  {
    slug: "lima-colonial-miraflores",
    title: "Lima colonial y Miraflores",
    destination: "lima",
    kind: "day_tour",
    days: 1,
    hours: 4,
    startTime: "09:30",
    price: 80,
    img: "lim",
    categories: ["cultura"],
    blurb: "Centro histórico, catacumbas y el malecón frente al Pacífico.",
  },
  {
    slug: "colca-full-day",
    title: "Cañón del Colca full day",
    destination: "arequipa",
    kind: "day_tour",
    days: 1,
    hours: 15,
    startTime: "03:00",
    price: 140,
    img: "col",
    categories: ["aventura", "naturaleza"],
    blurb: "Cruz del Cóndor por la mañana y baños termales en Chivay.",
  },
  {
    slug: "arequipa-ciudad-blanca",
    title: "Arequipa, la Ciudad Blanca",
    destination: "arequipa",
    kind: "day_tour",
    days: 1,
    hours: 4,
    startTime: "14:00",
    price: 60,
    img: "are",
    categories: ["cultura"],
    blurb: "Plaza de Armas, Monasterio de Santa Catalina y miradores.",
  },
];

type Meeting = { meetingPoint: string; meetingLat: number; meetingLng: number };

// Punto de encuentro por destino, para que todo paquete tenga mapa aunque no traiga itinerario.
const MEETINGS: Record<string, Meeting> = {
  cusco: { meetingPoint: "Plaza de Armas de Cusco", meetingLat: -13.5167, meetingLng: -71.9785 },
  puno: { meetingPoint: "Plaza de Armas de Puno", meetingLat: -15.8402, meetingLng: -70.0275 },
  arequipa: {
    meetingPoint: "Plaza de Armas de Arequipa",
    meetingLat: -16.3989,
    meetingLng: -71.5369,
  },
  lima: { meetingPoint: "Parque Kennedy, Miraflores", meetingLat: -12.1219, meetingLng: -77.03 },
  "ica-paracas": {
    meetingPoint: "Muelle El Chaco, Paracas",
    meetingLat: -13.834,
    meetingLng: -76.2518,
  },
  amazonia: {
    meetingPoint: "Plaza de Armas de Puerto Maldonado",
    meetingLat: -12.5933,
    meetingLng: -69.1891,
  },
  mancora: { meetingPoint: "Centro de Máncora", meetingLat: -4.1031, meetingLng: -81.0453 },
  huaraz: { meetingPoint: "Plaza de Armas de Huaraz", meetingLat: -9.5278, meetingLng: -77.5278 },
};

// El buggy sale del oasis, no del muelle de Paracas.
const MEETING_OVERRIDES: Record<string, Meeting> = {
  "buggy-sandboard-huacachina": {
    meetingPoint: "Oasis de Huacachina",
    meetingLat: -14.0875,
    meetingLng: -75.7626,
  },
};

export const seedPackages: (typeof packagesTable.$inferInsert)[] = rows.map((r) => ({
  id: seedId(`package:${r.slug}`),
  organizerId: seedId("organizer:wayra"),
  destinationId: seedId(`destination:${r.destination}`),
  kind: r.kind,
  slug: r.slug,
  title: r.title,
  blurb: r.blurb,
  description: r.description ?? r.blurb,
  durationDays: r.days,
  nights: r.kind === "package" ? r.days - 1 : 0,
  durationHours: r.hours ?? null,
  startTime: r.startTime ?? null,
  priceCents: soles(r.price),
  currency: "PEN",
  maxGroupSize: r.kind === "package" ? 12 : 30,
  languages: r.languages ?? ["es"],
  ...(MEETING_OVERRIDES[r.slug] ?? MEETINGS[r.destination]),
  coverImageUrl: SEED_IMAGES[r.img].path,
  status: "published",
}));

export const seedPackageCategories: (typeof packageCategoriesTable.$inferInsert)[] = rows.flatMap((r) =>
  r.categories.map((c) => ({
    packageId: seedId(`package:${r.slug}`),
    categoryId: seedId(`category:${c}`),
  })),
);
