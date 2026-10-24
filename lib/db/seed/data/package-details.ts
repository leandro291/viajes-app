import {
  packageImages as packageImagesTable,
  packageInclusions as packageInclusionsTable,
  packageItineraryDays as packageItineraryDaysTable,
} from "../../schema";
import { seedId } from "../helpers";
import { SEED_IMAGES, type SeedImageKey } from "../images";

const MPM = "machu-picchu-magico";
const packageId = seedId(`package:${MPM}`);

const gallery: [SeedImageKey, string][] = [
  ["mp", "Machu Picchu desde la montaña"],
  ["mp2", "Terrazas de Machu Picchu y Huayna Picchu"],
  ["tren", "Tren sobre el río Urubamba"],
  ["pis", "Terrazas de Pisac en el Valle Sagrado"],
  ["cus", "Catedral en la Plaza de Armas de Cusco"],
  ["agc", "Calle de Aguas Calientes"],
];

export const seedPackageImages: (typeof packageImagesTable.$inferInsert)[] = gallery.map(
  ([key, alt], i) => ({
    id: seedId(`package_image:${MPM}:${key}`),
    packageId,
    url: SEED_IMAGES[key].path,
    alt,
    credit: SEED_IMAGES[key].credit,
    sortOrder: i,
  }),
);

type Day = {
  place: string;
  title: string;
  transportLeg: string;
  img: SeedImageKey;
  lat: number;
  lng: number;
  description: string;
};

const days: Day[] = [
  {
    place: "Cusco",
    title: "Llegada a Cusco y ciudad imperial",
    transportLeg: "Llegas en avión · noche en Cusco",
    img: "cus",
    lat: -13.5167,
    lng: -71.9785,
    description:
      "Recepción en el aeropuerto y traslado al hotel. Por la tarde, paseo suave por la Plaza de Armas, el Qorikancha y San Blas para aclimatarte.",
  },
  {
    place: "Pisac y Ollantaytambo",
    title: "Valle Sagrado de los Incas",
    transportLeg: "En bus por el valle · 93 km",
    img: "pis",
    lat: -13.4208,
    lng: -71.8478,
    description:
      "Salida temprano hacia Pisac, almuerzo buffet con productos locales y visita a Ollantaytambo. Duermes en el valle, a menor altura.",
  },
  {
    place: "Aguas Calientes",
    title: "Tren a Aguas Calientes",
    transportLeg: "Tren panorámico · 1 h 40 min",
    img: "tren",
    lat: -13.1547,
    lng: -72.5258,
    description:
      "Tren panorámico desde Ollantaytambo. Tarde libre en el pueblo y briefing con tu guía para el ingreso del día siguiente.",
  },
  {
    place: "Machu Picchu",
    title: "Machu Picchu y regreso",
    transportLeg: "Bus de subida · 25 min",
    img: "mp2",
    lat: -13.1631,
    lng: -72.545,
    description:
      "Subida en bus a primera hora y visita guiada de unas dos horas. Tiempo libre en la ciudadela y regreso en tren a Cusco.",
  },
];

export const seedPackageItineraryDays: (typeof packageItineraryDaysTable.$inferInsert)[] = days.map(
  ({ img, ...d }, i) => ({
    id: seedId(`package_itinerary_day:${MPM}:${i + 1}`),
    packageId,
    dayNumber: i + 1,
    imageUrl: SEED_IMAGES[img].path,
    ...d,
  }),
);

const included: string[] = [
  "3 noches de alojamiento con desayuno",
  "Traslados aeropuerto, estación y hotel",
  "Tren panorámico ida y vuelta",
  "Entrada a Machu Picchu y bus de subida",
  "Guía profesional en español o inglés",
  "Seguro de viaje durante el tour",
];

const excluded: string[] = [
  "Vuelos hasta Cusco",
  "Almuerzos y cenas no indicados",
  "Propinas",
  "Gastos personales",
];

export const seedPackageInclusions: (typeof packageInclusionsTable.$inferInsert)[] = [
  ...included.map((text, i) => ({ kind: "included" as const, text, sortOrder: i + 1 })),
  ...excluded.map((text, i) => ({ kind: "excluded" as const, text, sortOrder: i + 1 })),
].map((row) => ({
  id: seedId(`package_inclusion:${MPM}:${row.kind}:${row.sortOrder}`),
  packageId,
  ...row,
}));
