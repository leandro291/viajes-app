import {
  packageImages as packageImagesTable,
  packageInclusions as packageInclusionsTable,
  packageItineraryDays as packageItineraryDaysTable,
} from "../../schema";
import { seedId } from "../helpers";
import { SEED_IMAGES, type SeedImageKey } from "../images";

type Day = {
  place: string;
  title: string;
  transportLeg: string;
  img?: SeedImageKey; // sin foto propia: el día se muestra sin imagen
  lat: number;
  lng: number;
  description: string;
};

type Detail = {
  gallery: [SeedImageKey, string][];
  days: Day[];
  included: string[];
  excluded: string[];
};

// Machu Picchu Mágico sale del artefacto de diseño. Los demás son contenido de ejemplo
// (ficticio, como el resto del seed) para probar el detalle sin secciones vacías; los
// paquetes que no aparecen aquí quedan sin galería, itinerario ni inclusiones a propósito.
const details: Record<string, Detail> = {
  "machu-picchu-magico": {
    gallery: [
      ["mp", "Machu Picchu desde la montaña"],
      ["mp2", "Terrazas de Machu Picchu y Huayna Picchu"],
      ["tren", "Tren sobre el río Urubamba"],
      ["pis", "Terrazas de Pisac en el Valle Sagrado"],
      ["cus", "Catedral en la Plaza de Armas de Cusco"],
      ["agc", "Calle de Aguas Calientes"],
    ],
    days: [
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
    ],
    included: [
      "3 noches de alojamiento con desayuno",
      "Traslados aeropuerto, estación y hotel",
      "Tren panorámico ida y vuelta",
      "Entrada a Machu Picchu y bus de subida",
      "Guía profesional en español o inglés",
      "Seguro de viaje durante el tour",
    ],
    excluded: [
      "Vuelos hasta Cusco",
      "Almuerzos y cenas no indicados",
      "Propinas",
      "Gastos personales",
    ],
  },

  "cusco-valle-sagrado": {
    gallery: [
      ["cus", "Catedral en la Plaza de Armas de Cusco"],
      ["sac", "Muros de piedra de Sacsayhuamán"],
      ["pis", "Terrazas de Pisac en el Valle Sagrado"],
    ],
    days: [
      {
        place: "Cusco",
        title: "Llegada y ciudad imperial",
        transportLeg: "Traslado del aeropuerto al hotel",
        img: "cus",
        lat: -13.5167,
        lng: -71.9785,
        description:
          "Recepción en el aeropuerto y descanso en el hotel céntrico. Por la tarde, paseo guiado por la Plaza de Armas y San Blas.",
      },
      {
        place: "Sacsayhuamán",
        title: "Fortaleza de Sacsayhuamán",
        transportLeg: "Bus turístico · 15 min",
        img: "sac",
        lat: -13.5086,
        lng: -71.9818,
        description:
          "Visita a Sacsayhuamán, Q'enqo y Puka Pukara con guía en español. Almuerzo libre y tarde para recorrer los mercados de Cusco.",
      },
      {
        place: "Pisac",
        title: "Pisac y su mercado",
        transportLeg: "En bus por el valle · 33 km",
        img: "pis",
        lat: -13.4208,
        lng: -71.8478,
        description:
          "Mañana en las terrazas arqueológicas de Pisac y paseo por el mercado artesanal. Tarde libre en el pueblo.",
      },
      {
        place: "Moray y Ollantaytambo",
        title: "Moray y Ollantaytambo",
        transportLeg: "En bus por el valle · 60 km",
        lat: -13.2587,
        lng: -72.2635,
        description:
          "Visita a los andenes circulares de Moray y a la fortaleza de Ollantaytambo. Regreso a Cusco al atardecer.",
      },
      {
        place: "Cusco",
        title: "Día libre y despedida",
        transportLeg: "Traslado al aeropuerto",
        img: "cus",
        lat: -13.5167,
        lng: -71.9785,
        description:
          "Mañana libre para compras o para repetir tu rincón favorito. Traslado al aeropuerto según el horario de tu vuelo.",
      },
    ],
    included: [
      "4 noches de alojamiento céntrico con desayuno",
      "Traslados aeropuerto y hotel",
      "Transporte turístico en el Valle Sagrado",
      "Entradas a los sitios arqueológicos del circuito",
      "Guía profesional en español",
    ],
    excluded: ["Vuelos hasta Cusco", "Almuerzos y cenas", "Propinas", "Gastos personales"],
  },

  "titicaca-islas-uros": {
    gallery: [["uro", "Balsa de totora en el lago Titicaca, cerca de las islas Uros"]],
    days: [
      {
        place: "Puno",
        title: "Llegada a Puno y Uros",
        transportLeg: "Lancha desde el puerto · 30 min",
        img: "uro",
        lat: -15.8225,
        lng: -69.9697,
        description:
          "Recepción en Puno y navegación a las islas flotantes de los Uros, donde las familias te muestran cómo construyen sus islas de totora.",
      },
      {
        place: "Amantaní",
        title: "Noche con una familia en Amantaní",
        transportLeg: "Lancha · 3 h",
        lat: -15.65,
        lng: -69.7167,
        description:
          "Cruzas el lago hasta Amantaní, subes a Pachatata al atardecer y cenas y duermes en la casa de una familia local.",
      },
      {
        place: "Taquile",
        title: "Taquile y regreso",
        transportLeg: "Lancha · 1 h 30 min",
        lat: -15.7667,
        lng: -69.6833,
        description:
          "Caminata por Taquile, conocida por sus tejidos, almuerzo de trucha y regreso a Puno por la tarde.",
      },
    ],
    included: [
      "2 noches de alojamiento (1 en casa de familia en Amantaní)",
      "Lancha a Uros, Amantaní y Taquile",
      "Pensión completa en las islas",
      "Guía profesional en español",
      "Seguro de viaje durante el tour",
    ],
    excluded: ["Transporte hasta Puno", "Bebidas", "Propinas"],
  },

  "canon-del-colca": {
    gallery: [
      ["col", "Cóndor andino en vuelo sobre el Colca"],
      ["are", "Plaza de Armas de Arequipa de noche"],
    ],
    days: [
      {
        place: "Arequipa",
        title: "De Arequipa a Chivay",
        transportLeg: "Bus turístico · 3 h 30 min",
        img: "are",
        lat: -15.6372,
        lng: -71.6019,
        description:
          "Salida por la mañana cruzando la reserva de Salinas y Aguada Blanca. Llegada a Chivay y tarde libre.",
      },
      {
        place: "Cruz del Cóndor",
        title: "Cruz del Cóndor",
        transportLeg: "Bus · 1 h 30 min",
        img: "col",
        lat: -15.6094,
        lng: -71.9694,
        description:
          "Madrugada en el mirador de la Cruz del Cóndor para ver el vuelo de los cóndores, con paradas en los pueblos del valle.",
      },
      {
        place: "Chivay",
        title: "Aguas termales y regreso",
        transportLeg: "Bus turístico · 3 h 30 min",
        lat: -15.6372,
        lng: -71.6019,
        description:
          "Baño en las aguas termales de La Calera antes de volver a Arequipa por la tarde.",
      },
    ],
    included: [
      "2 noches de alojamiento con desayuno",
      "Transporte turístico Arequipa – Colca – Arequipa",
      "Entrada a las aguas termales",
      "Guía profesional en español",
      "Boleto turístico del Colca",
    ],
    excluded: ["Almuerzos y cenas", "Propinas", "Gastos personales"],
  },

  "lima-sabores-y-cultura": {
    gallery: [["lim", "Surfista en una ola frente a la costa de Lima"]],
    days: [
      {
        place: "Centro histórico",
        title: "Lima colonial",
        transportLeg: "A pie y en bus · 3 h",
        lat: -12.0464,
        lng: -77.0428,
        description:
          "Plaza Mayor, la Catedral y el Convento de San Francisco con sus catacumbas. Almuerzo criollo en el centro.",
      },
      {
        place: "Barranco",
        title: "Barranco y Miraflores",
        transportLeg: "Traslado privado · 40 min",
        img: "lim",
        lat: -12.1403,
        lng: -77.0201,
        description:
          "Paseo por el Puente de los Suspiros, las galerías de Barranco y el malecón de Miraflores al atardecer.",
      },
      {
        place: "Miraflores",
        title: "Clase de cocina de ceviche",
        transportLeg: "Traslado privado · 15 min",
        lat: -12.1219,
        lng: -77.0297,
        description:
          "Recorres un mercado local con el chef y preparas tu propio ceviche y un pisco sour en una clase de tres horas.",
      },
    ],
    included: [
      "2 noches de alojamiento con desayuno",
      "Traslados entre los puntos del recorrido",
      "Clase de cocina con almuerzo",
      "Entradas al convento y catacumbas",
      "Guía profesional en español",
    ],
    excluded: ["Vuelos hasta Lima", "Cenas", "Propinas"],
  },
};

const slugs = Object.keys(details);

export const seedPackageImages: (typeof packageImagesTable.$inferInsert)[] = slugs.flatMap(
  (slug) =>
    details[slug].gallery.map(([key, alt], i) => ({
      id: seedId(`package_image:${slug}:${key}`),
      packageId: seedId(`package:${slug}`),
      url: SEED_IMAGES[key].path,
      alt,
      credit: SEED_IMAGES[key].credit,
      sortOrder: i,
    })),
);

export const seedPackageItineraryDays: (typeof packageItineraryDaysTable.$inferInsert)[] =
  slugs.flatMap((slug) =>
    details[slug].days.map(({ img, ...d }, i) => ({
      id: seedId(`package_itinerary_day:${slug}:${i + 1}`),
      packageId: seedId(`package:${slug}`),
      dayNumber: i + 1,
      imageUrl: img ? SEED_IMAGES[img].path : null,
      ...d,
    })),
  );

export const seedPackageInclusions: (typeof packageInclusionsTable.$inferInsert)[] = slugs.flatMap(
  (slug) =>
    [
      ...details[slug].included.map((text, i) => ({ kind: "included" as const, text, sortOrder: i + 1 })),
      ...details[slug].excluded.map((text, i) => ({ kind: "excluded" as const, text, sortOrder: i + 1 })),
    ].map((row) => ({
      id: seedId(`package_inclusion:${slug}:${row.kind}:${row.sortOrder}`),
      packageId: seedId(`package:${slug}`),
      ...row,
    })),
);
