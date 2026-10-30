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
// (ficticio, como el resto del seed) para probar el detalle sin secciones vacías. Los tours de
// un día traen un solo día de itinerario y sin galería (el detalle cae a la portada); su mapa
// es el del punto de encuentro (ver packages.ts).
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

  "amazonia-tambopata": {
    gallery: [["tam", "Río y selva en la Reserva Nacional Tambopata"]],
    days: [
      {
        place: "Puerto Maldonado",
        title: "Llegada a Puerto Maldonado",
        transportLeg: "Lancha por el río Tambopata · 2 h",
        img: "tam",
        lat: -12.5933,
        lng: -69.1891,
        description:
          "Recepción en el aeropuerto, almuerzo en la ciudad y viaje en lancha hasta el albergue, entre monos y aves que te acompañan en la orilla.",
      },
      {
        place: "Reserva Nacional Tambopata",
        title: "Caminata por la selva",
        transportLeg: "A pie desde el albergue",
        lat: -12.8167,
        lng: -69.3667,
        description:
          "Caminata guiada al amanecer para ver aves y mamíferos, y recorrido nocturno para escuchar la selva cuando despierta.",
      },
      {
        place: "Collpa de guacamayos",
        title: "Collpa de guacamayos",
        transportLeg: "Lancha y caminata · 1 h 30 min",
        lat: -13.0,
        lng: -69.5833,
        description:
          "Salida de madrugada a la collpa, la pared de arcilla donde cientos de guacamayos se juntan cada mañana.",
      },
      {
        place: "Lago Sandoval",
        title: "Lago Sandoval y regreso",
        transportLeg: "Canoa y lancha · 2 h",
        lat: -12.6167,
        lng: -69.1667,
        description:
          "Paseo en canoa por el lago Sandoval para buscar nutrias gigantes y regreso a Puerto Maldonado por la tarde.",
      },
    ],
    included: [
      "3 noches de alojamiento en albergue de selva",
      "Pensión completa",
      "Traslados en lancha por el río",
      "Guía naturalista en español",
      "Botas de jebe y poncho de lluvia",
    ],
    excluded: ["Vuelos hasta Puerto Maldonado", "Bebidas", "Propinas"],
  },

  "paracas-huacachina": {
    gallery: [
      ["par", "Costa desértica de la Reserva Nacional de Paracas"],
      ["hua", "Oasis de Huacachina entre las dunas"],
    ],
    days: [
      {
        place: "Paracas",
        title: "Islas Ballestas y Reserva de Paracas",
        transportLeg: "Lancha desde el muelle · 2 h",
        img: "bal",
        lat: -13.834,
        lng: -76.2518,
        description:
          "Lancha a las islas Ballestas para ver lobos marinos y pingüinos, y recorrido en bus por los acantilados de la reserva. Duermes en Paracas.",
      },
      {
        place: "Huacachina",
        title: "Dunas de Huacachina",
        transportLeg: "En bus · 2 h",
        img: "hua",
        lat: -14.0875,
        lng: -75.7626,
        description:
          "Viaje al oasis de Huacachina, buggy y sandboard entre las dunas al atardecer y regreso por la noche.",
      },
    ],
    included: [
      "1 noche de alojamiento con desayuno",
      "Lancha a las islas Ballestas",
      "Buggy y tabla de sandboard",
      "Entrada a la Reserva Nacional de Paracas",
    ],
    excluded: ["Transporte hasta Paracas", "Almuerzos y cenas", "Propinas"],
  },

  "mancora-sol-y-playa": {
    gallery: [["man", "Playa de Máncora al atardecer"]],
    days: [
      {
        place: "Máncora",
        title: "Llegada a Máncora",
        transportLeg: "Traslado desde el aeropuerto · 1 h",
        img: "man",
        lat: -4.1031,
        lng: -81.0453,
        description:
          "Traslado al hotel frente al mar, tarde libre en la playa y cena de pescado fresco en el malecón.",
      },
      {
        place: "Vichayito",
        title: "Vichayito y la playa tranquila",
        transportLeg: "En mototaxi · 15 min",
        lat: -4.1869,
        lng: -81.0872,
        description:
          "Día de playa en Vichayito, de aguas calmas, con clase de surf opcional por la mañana.",
      },
      {
        place: "Punta Sal",
        title: "Punta Sal",
        transportLeg: "En bus · 1 h",
        lat: -3.9333,
        lng: -80.9833,
        description:
          "Excursión a Punta Sal, una de las playas más largas del norte, con almuerzo de mariscos incluido.",
      },
      {
        place: "Máncora",
        title: "Última tarde y despedida",
        transportLeg: "En bus · 1 h",
        lat: -4.1031,
        lng: -81.0453,
        description:
          "Mañana libre para compras y un último baño. Traslado al aeropuerto por la tarde.",
      },
    ],
    included: [
      "3 noches de alojamiento frente al mar",
      "Desayunos",
      "Traslados aeropuerto y excursiones",
      "Almuerzo en Punta Sal",
    ],
    excluded: ["Vuelos hasta Piura", "Otras comidas", "Clases de surf"],
  },

  "laguna-69-huaraz": {
    gallery: [["l69", "Laguna 69 al pie de la cordillera Blanca"]],
    days: [
      {
        place: "Huaraz",
        title: "Llegada y aclimatación",
        transportLeg: "Bus desde Lima · 8 h",
        lat: -9.5278,
        lng: -77.5278,
        description:
          "Llegada a Huaraz, a más de 3 000 metros. Paseo corto por la ciudad y descanso para aclimatarte.",
      },
      {
        place: "Lagunas de Llanganuco",
        title: "Lagunas de Llanganuco",
        transportLeg: "En camioneta · 2 h",
        lat: -9.0667,
        lng: -77.65,
        description:
          "Excursión a las lagunas gemelas de Llanganuco, de color turquesa, con caminata suave a su orilla.",
      },
      {
        place: "Laguna 69",
        title: "Caminata a la Laguna 69",
        transportLeg: "En camioneta · 3 h",
        img: "l69",
        lat: -9.0072,
        lng: -77.6286,
        description:
          "Salida de madrugada y caminata de unas 6 horas ida y vuelta hasta la Laguna 69, con vista al nevado Chacraraju.",
      },
      {
        place: "Chavín de Huántar",
        title: "Chavín de Huántar y regreso",
        transportLeg: "En bus · 2 h",
        lat: -9.5958,
        lng: -77.1767,
        description:
          "Visita al sitio arqueológico de Chavín de Huántar y regreso a Huaraz al final de la tarde.",
      },
    ],
    included: [
      "3 noches de alojamiento con desayuno",
      "Transporte en camioneta a las excursiones",
      "Guía de montaña en español",
      "Entrada al Parque Nacional Huascarán",
    ],
    excluded: ["Bus hasta Huaraz", "Almuerzos", "Propinas"],
  },

  "sabores-del-peru": {
    gallery: [["lim", "Costa de Lima desde Miraflores"]],
    days: [
      {
        place: "Miraflores",
        title: "Cevichería y malecón",
        transportLeg: "A pie y en taxi",
        img: "lim",
        lat: -12.1219,
        lng: -77.0297,
        description:
          "Almuerzo de ceviche en Miraflores y paseo por el malecón frente al Pacífico para entrar en ambiente.",
      },
      {
        place: "Surquillo",
        title: "Mercado y cocina criolla",
        transportLeg: "En taxi · 15 min",
        lat: -12.1131,
        lng: -77.0155,
        description:
          "Recorrido por el mercado de Surquillo, compra de ingredientes y clase de cocina criolla con almuerzo.",
      },
      {
        place: "Barranco",
        title: "Barranco y sus bares",
        transportLeg: "En taxi · 15 min",
        lat: -12.1497,
        lng: -77.0219,
        description:
          "Tarde por las galerías y el puente de los Suspiros, y cata de pisco en un bar del barrio.",
      },
      {
        place: "La Punta",
        title: "Callao y La Punta",
        transportLeg: "En bus · 40 min",
        lat: -12.0722,
        lng: -77.165,
        description:
          "Visita al puerto del Callao y a La Punta, con almuerzo de pescado frito frente al mar.",
      },
      {
        place: "Centro histórico",
        title: "Centro histórico y despedida",
        transportLeg: "En taxi · 30 min",
        lat: -12.0464,
        lng: -77.0428,
        description:
          "Mañana en la Plaza Mayor, la Catedral y los portales, y almuerzo de despedida con platos de la sierra.",
      },
    ],
    included: [
      "4 noches de alojamiento con desayuno",
      "Clase de cocina criolla con almuerzo",
      "Cata de pisco",
      "Traslados entre los puntos del recorrido",
      "Guía gastronómico en español",
    ],
    excluded: ["Vuelos hasta Lima", "Otras comidas", "Propinas"],
  },

  "montana-de-colores": {
    gallery: [],
    days: [
      {
        place: "Vinicunca",
        title: "Caminata a la Montaña de Colores",
        transportLeg: "En bus · 3 h 30 min",
        img: "vin",
        lat: -13.8697,
        lng: -71.3033,
        description:
          "Salida de madrugada desde Cusco, desayuno en ruta y caminata de unas 2 horas hasta el mirador de Vinicunca, a más de 5 000 metros. Almuerzo en el valle y regreso por la tarde.",
      },
    ],
    included: [
      "Recojo en tu hotel",
      "Desayuno y almuerzo",
      "Guía profesional en español",
      "Entrada a la Montaña de Colores",
    ],
    excluded: ["Caballo para la subida", "Bastones", "Propinas"],
  },

  "machu-picchu-en-un-dia": {
    gallery: [],
    days: [
      {
        place: "Machu Picchu",
        title: "Machu Picchu en el día",
        transportLeg: "Tren y bus de subida · 1 h 45 min",
        img: "mp",
        lat: -13.1631,
        lng: -72.545,
        description:
          "Salida de madrugada hacia la estación, tren panorámico hasta Aguas Calientes y bus de subida a la ciudadela. Recorres con tu guía y vuelves a Cusco por la noche.",
      },
    ],
    included: [
      "Tren de ida y vuelta",
      "Bus de subida y bajada",
      "Entrada a Machu Picchu",
      "Guía en español",
    ],
    excluded: ["Almuerzo", "Entrada a Huayna Picchu", "Propinas"],
  },

  "valle-sagrado-completo": {
    gallery: [],
    days: [
      {
        place: "Pisac y Ollantaytambo",
        title: "Valle Sagrado de punta a punta",
        transportLeg: "En bus · 93 km",
        img: "pis",
        lat: -13.4208,
        lng: -71.8478,
        description:
          "Mañana en el mercado y las terrazas de Pisac, almuerzo buffet en Urubamba y tarde en la fortaleza de Ollantaytambo antes de volver a Cusco.",
      },
    ],
    included: [
      "Bus con recojo en tu hotel",
      "Almuerzo buffet en Urubamba",
      "Guía profesional en español",
    ],
    excluded: ["Boleto turístico del Cusco", "Propinas"],
  },

  "city-tour-sacsayhuaman": {
    gallery: [],
    days: [
      {
        place: "Sacsayhuamán",
        title: "Ciudad imperial y sitios cercanos",
        transportLeg: "En bus · 25 min",
        img: "sac",
        lat: -13.5086,
        lng: -71.9819,
        description:
          "Por la tarde visitas el Qorikancha y la Catedral, y subes en bus a Sacsayhuamán, Q'enqo, Puca Pucara y Tambomachay con tu guía.",
      },
    ],
    included: [
      "Transporte entre los sitios",
      "Guía en español",
      "Entrada al Qorikancha",
    ],
    excluded: ["Boleto turístico del Cusco", "Propinas"],
  },

  "islas-ballestas": {
    gallery: [],
    days: [
      {
        place: "Islas Ballestas",
        title: "Lancha a las islas Ballestas",
        transportLeg: "Lancha desde el muelle · 2 h",
        img: "bal",
        lat: -13.7333,
        lng: -76.4167,
        description:
          "Lancha desde el muelle de El Chaco, con parada frente al Candelabro y recorrido por las islas para ver lobos marinos, pingüinos y aves guaneras.",
      },
    ],
    included: [
      "Lancha a las islas Ballestas",
      "Guía en español",
      "Chaleco salvavidas",
    ],
    excluded: ["Tasa de ingreso a la reserva", "Transporte hasta Paracas", "Propinas"],
  },

  "buggy-sandboard-huacachina": {
    gallery: [],
    days: [
      {
        place: "Huacachina",
        title: "Buggy y sandboard al atardecer",
        transportLeg: "Buggy por las dunas · 2 h",
        img: "hua",
        lat: -14.0875,
        lng: -75.7626,
        description:
          "Salida en buggy por las dunas, paradas para deslizarte en tabla y mirador para ver el atardecer sobre el oasis, con fotos incluidas.",
      },
    ],
    included: [
      "Buggy con conductor experto",
      "Tabla de sandboard",
      "Fotos en el oasis",
    ],
    excluded: ["Transporte hasta Huacachina", "Bebidas", "Propinas"],
  },

  "islas-uros-medio-dia": {
    gallery: [],
    days: [
      {
        place: "Islas Uros",
        title: "Navegación por las islas flotantes",
        transportLeg: "Bote desde el puerto · 30 min",
        img: "uro",
        lat: -15.8225,
        lng: -69.9697,
        description:
          "Bote desde Puno hasta las islas flotantes de totora. Una familia te muestra cómo construyen sus islas y puedes pasear en una balsa tradicional.",
      },
    ],
    included: [
      "Bote a las islas Uros",
      "Visita a una isla flotante",
      "Guía en español",
    ],
    excluded: ["Entrada a las islas", "Propinas"],
  },

  "lima-colonial-miraflores": {
    gallery: [],
    days: [
      {
        place: "Centro histórico",
        title: "Lima colonial y malecón",
        transportLeg: "En bus · 4 h de recorrido",
        img: "lim",
        lat: -12.0464,
        lng: -77.0428,
        description:
          "Recorres la Plaza Mayor, la Catedral y las catacumbas del convento de San Francisco, y terminas en el malecón de Miraflores frente al Pacífico.",
      },
    ],
    included: [
      "Recojo en tu hotel",
      "Entrada a las catacumbas",
      "Guía en español",
    ],
    excluded: ["Almuerzo", "Propinas"],
  },

  "colca-full-day": {
    gallery: [],
    days: [
      {
        place: "Cruz del Cóndor",
        title: "Cruz del Cóndor y Chivay",
        transportLeg: "En bus · 3 h 30 min",
        img: "col",
        lat: -15.6097,
        lng: -71.8886,
        description:
          "Salida de madrugada desde Arequipa, mirador de la Cruz del Cóndor para ver volar a los cóndores, almuerzo en Chivay y baños termales antes de volver.",
      },
    ],
    included: [
      "Transporte desde Arequipa",
      "Desayuno y almuerzo",
      "Guía en español",
      "Entrada a los baños termales",
    ],
    excluded: ["Boleto turístico del Colca", "Propinas"],
  },

  "arequipa-ciudad-blanca": {
    gallery: [],
    days: [
      {
        place: "Monasterio de Santa Catalina",
        title: "Plaza de Armas y Santa Catalina",
        transportLeg: "A pie y en bus · 4 h",
        img: "are",
        lat: -16.3955,
        lng: -71.5367,
        description:
          "Caminata por la Plaza de Armas, visita al Monasterio de Santa Catalina y subida a los miradores de Yanahuara y Carmen Alto para ver el Misti.",
      },
    ],
    included: [
      "Guía en español",
      "Entrada al Monasterio de Santa Catalina",
      "Transporte a los miradores",
    ],
    excluded: ["Bebidas", "Propinas"],
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
