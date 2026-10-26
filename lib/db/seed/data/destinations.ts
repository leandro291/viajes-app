import {
  destinationClimateMonths,
  destinationFaqs,
  destinationSights,
  destinations,
} from "../../schema";
import { seedId } from "../helpers";
import { SEED_IMAGES, type SeedImageKey } from "../images";

const img = (key: SeedImageKey) => SEED_IMAGES[key].path;

type Season = "dry" | "mixed" | "rainy";
type Sight = [name: string, image: SeedImageKey, description: string, lat: number, lng: number];

type Detail = {
  tagline: string;
  description: string;
  altitudeM: number;
  bestSeasonText: string;
  fromLimaText: string | null;
  howToGetText: string;
  tipsText: string;
  climate: readonly Season[]; // ene → dic
  sights: Sight[];
  faqs: [question: string, answer: string][];
};

// Contenido ilustrativo (altitudes, tiempos, coordenadas y textos aproximados), igual que todo el seed.
const CHANGE_DATE: [string, string] = [
  "¿Puedo cambiar la fecha después de reservar?",
  "Sí, desde Mis reservas, hasta 48 horas antes de la salida y sujeto a disponibilidad.",
];
const TICKETS = (question: string): [string, string] => [
  question,
  "Solo en los paquetes que lo indican. Revisa el detalle del paquete antes de reservar.",
];

const ALTIPLANO: Season[] = [
  "rainy", "rainy", "rainy", "mixed", "dry", "dry", "dry", "dry", "dry", "mixed", "rainy", "rainy",
];
const COAST: Season[] = [
  "dry", "dry", "dry", "dry", "mixed", "mixed", "mixed", "mixed", "mixed", "mixed", "mixed", "dry",
];

const detail: Record<string, Detail> = {
  cusco: {
    tagline: "Antigua capital del Imperio inca",
    description:
      "Antigua capital del Imperio inca y puerta de entrada a Machu Picchu. Piedra, mercados y montañas a cada paso.",
    altitudeM: 3399,
    bestSeasonText: "Mayo a septiembre",
    fromLimaText: "~1 h 30 en avión",
    howToGetText:
      "Vuelo directo desde Lima o bus desde Arequipa y Puno. A Machu Picchu se llega en tren por el valle del Urubamba.",
    tipsText:
      "Cusco está a más de 3 000 m. Toma el primer día con calma, bebe agua y evita comidas pesadas.",
    climate: ALTIPLANO,
    sights: [
      ["Machu Picchu", "mp", "La ciudadela inca más famosa del mundo, entre nubes y montañas.", -13.163, -72.545],
      ["Valle Sagrado", "pis", "Terrazas de Pisac, mercados y ruinas que siguen vivas.", -13.421, -71.848],
      ["Sacsayhuamán", "sac", "Muros colosales de piedra sobre la ciudad, a minutos del centro.", -13.509, -71.982],
      ["Vinicunca", "vin", "La montaña de colores, una caminata de altura para madrugadores.", -13.87, -71.303],
      ["Aguas Calientes", "agc", "El pueblo a los pies de Machu Picchu, donde llega el tren.", -13.155, -72.526],
    ],
    faqs: [
      [
        "¿Cuántos días necesito en Cusco?",
        "Lo ideal son 4 o 5 días: uno para aclimatarte, uno para la ciudad, uno para el Valle Sagrado y uno para Machu Picchu.",
      ],
      [
        "¿La entrada a Machu Picchu está incluida?",
        "Sí, en los paquetes que la indican. Reservamos tu horario de ingreso al confirmar la compra.",
      ],
      CHANGE_DATE,
    ],
  },
  arequipa: {
    tagline: "La Ciudad Blanca al pie del volcán Misti",
    description:
      "Ciudad de sillar blanco rodeada de volcanes, con cocina propia y el Cañón del Colca a pocas horas.",
    altitudeM: 2335,
    bestSeasonText: "Abril a diciembre",
    fromLimaText: "~1 h 45 en avión",
    howToGetText:
      "Vuelo directo desde Lima o bus desde Cusco y Puno. El Cañón del Colca queda a unas horas por tierra.",
    tipsText:
      "Arequipa está a más de 2 300 m. Descansa al llegar, bebe agua y consulta a tu médico si tienes condiciones de salud previas.",
    climate: ["rainy", "rainy", "mixed", "dry", "dry", "dry", "dry", "dry", "dry", "dry", "dry", "mixed"],
    sights: [
      ["Plaza de Armas", "are", "Arcos de sillar blanco y la catedral frente a los volcanes, el corazón de la ciudad.", -16.399, -71.537],
      ["Cañón del Colca", "col", "Un cañón profundo de terrazas antiguas, con cóndores sobrevolando el valle.", -15.605, -71.89],
    ],
    faqs: [
      [
        "¿Cuándo conviene viajar a Arequipa?",
        "De abril a diciembre es la mejor época; entre enero y marzo hay más lluvias.",
      ],
      TICKETS("¿Las entradas a los sitios están incluidas?"),
      CHANGE_DATE,
    ],
  },
  puno: {
    tagline: "Lago Titicaca y cultura viva en el altiplano",
    description:
      "Capital folclórica del Perú a orillas del lago Titicaca, con islas flotantes y tradiciones del altiplano.",
    altitudeM: 3827,
    bestSeasonText: "Mayo a septiembre",
    fromLimaText: "~1 h 50 en avión a Juliaca",
    howToGetText:
      "Vuelo a Juliaca y traslado por tierra hasta Puno, o bus desde Cusco y Arequipa.",
    tipsText:
      "Puno está a casi 3 900 m. Descansa al llegar, hidrátate y evita esfuerzos fuertes el primer día; consulta a tu médico si tienes condiciones previas.",
    climate: ALTIPLANO,
    sights: [
      ["Islas Uros", "uro", "Islas hechas de totora sobre el lago Titicaca, donde las familias conservan su forma de vida.", -15.822, -69.969],
    ],
    faqs: [
      [
        "¿Cuánto tiempo necesito en Puno?",
        "Con 2 o 3 días alcanzas para el lago y para aclimatarte con calma.",
      ],
      TICKETS("¿Las entradas a las islas están incluidas?"),
      CHANGE_DATE,
    ],
  },
  amazonia: {
    tagline: "Selva viva en Madre de Dios",
    description:
      "Selva tropical de Madre de Dios con ríos, lagunas y mucha fauna, a la que se entra desde Puerto Maldonado.",
    altitudeM: 183,
    bestSeasonText: "Mayo a octubre",
    fromLimaText: "~1 h 40 en avión a Puerto Maldonado",
    howToGetText:
      "Vuelo a Puerto Maldonado desde Lima o Cusco, y traslado por tierra o en bote hasta los albergues.",
    tipsText:
      "Lleva repelente, ropa ligera de manga larga y protector solar; consulta a tu médico si tienes condiciones de salud previas.",
    climate: ["rainy", "rainy", "rainy", "mixed", "dry", "dry", "dry", "dry", "dry", "dry", "mixed", "rainy"],
    sights: [
      ["Reserva Nacional Tambopata", "tam", "Reserva de selva baja con ríos, lagunas y gran variedad de aves y otros animales.", -12.9, -69.4],
    ],
    faqs: [
      [
        "¿Cuándo es mejor viajar a la Amazonía?",
        "De mayo a octubre llueve menos; de enero a marzo y en diciembre es temporada de lluvias.",
      ],
      TICKETS("¿Las entradas a la reserva están incluidas?"),
      CHANGE_DATE,
    ],
  },
  "ica-paracas": {
    tagline: "Dunas, desierto y mar en la costa sur",
    description:
      "Un oasis entre dunas en Huacachina y la costa de Paracas, frente a islas con lobos marinos y aves.",
    altitudeM: 406,
    bestSeasonText: "Todo el año",
    fromLimaText: "~4 h en bus",
    howToGetText:
      "Bus desde Lima por la Panamericana Sur; Ica y Paracas quedan a pocas horas una de otra.",
    tipsText:
      "La costa tiene sol fuerte y viento. Lleva protector solar, gorra y agua, y consulta a tu médico si tienes condiciones previas.",
    climate: ["dry", "dry", "dry", "dry", "mixed", "mixed", "mixed", "mixed", "dry", "dry", "dry", "dry"],
    sights: [
      ["Huacachina", "hua", "Un oasis rodeado de dunas enormes, ideal para ver el atardecer.", -14.088, -75.763],
      ["Islas Ballestas", "bal", "Islas rocosas frente a Paracas, hogar de lobos marinos y aves.", -13.736, -76.417],
      ["Bahía de Paracas", "par", "Costa desértica sobre el Pacífico, con acantilados, playas y cielo abierto.", -13.834, -76.251],
    ],
    faqs: [
      [
        "¿Cuándo es mejor viajar a Ica y Paracas?",
        "Se puede ir todo el año; entre mayo y agosto hay más nubes y viento.",
      ],
      TICKETS("¿Las entradas a las islas y a la reserva están incluidas?"),
      CHANGE_DATE,
    ],
  },
  huaraz: {
    tagline: "Puerta de la Cordillera Blanca",
    description:
      "Base de la Cordillera Blanca, con nevados, lagunas y caminatas para quienes disfrutan la montaña.",
    altitudeM: 3052,
    bestSeasonText: "Mayo a septiembre",
    fromLimaText: "~8 h en bus",
    howToGetText:
      "Bus desde Lima, un viaje largo por carretera hacia los Andes de Áncash.",
    tipsText:
      "Huaraz está a unos 3 000 m. Dedica un día a aclimatarte antes de caminar, bebe agua y consulta a tu médico si tienes condiciones previas.",
    climate: ALTIPLANO,
    sights: [
      ["Laguna 69", "l69", "Una laguna turquesa al pie de los nevados, a la que se llega tras una caminata de altura.", -9.013, -77.607],
    ],
    faqs: [
      [
        "¿Cuándo es mejor viajar a Huaraz?",
        "De mayo a septiembre hay más días secos y despejados para caminar; el resto del año llueve más.",
      ],
      TICKETS("¿La entrada al parque está incluida?"),
      CHANGE_DATE,
    ],
  },
  lima: {
    tagline: "Capital costera entre el mar y la cocina",
    description:
      "Capital frente al Pacífico, con centro histórico, acantilados sobre el mar y una cocina que mezcla tradiciones.",
    altitudeM: 154,
    bestSeasonText: "Diciembre a abril",
    fromLimaText: null,
    howToGetText:
      "Se llega por el aeropuerto Jorge Chávez, en el Callao, o en bus desde el resto del país.",
    tipsText:
      "El clima costero es húmedo y con neblina buena parte del año. Lleva una chaqueta ligera y protector solar.",
    climate: COAST,
    sights: [
      ["Costa Verde", "lim", "Una franja de acantilados y parques sobre el Pacífico, ideal para caminar frente al mar.", -12.125, -77.039],
    ],
    faqs: [
      [
        "¿Cuándo es mejor viajar a Lima?",
        "De diciembre a abril hay más sol y menos neblina; el resto del año el cielo suele estar nublado.",
      ],
      TICKETS("¿Las entradas a museos y sitios están incluidas?"),
      CHANGE_DATE,
    ],
  },
  mancora: {
    tagline: "Playa y sol en el norte",
    description:
      "Larga playa del norte peruano, con olas y sol casi todo el año, para descansar o aprender a surfear.",
    altitudeM: 4,
    bestSeasonText: "Diciembre a abril",
    fromLimaText: "~1 h 50 en avión a Talara + 1 h por tierra",
    howToGetText: "Vuelo a Talara y 1 h por tierra hasta Máncora, o bus desde Piura.",
    tipsText:
      "Usa protector solar, gorra y bebe agua. Si vas a surfear, hazlo con instructor y respeta las señales de la playa.",
    climate: COAST,
    sights: [
      ["Playa de Máncora", "man", "Una larga playa de arena y olas, con atardeceres abiertos sobre el Pacífico.", -4.103, -81.045],
    ],
    faqs: [
      [
        "¿Cuándo es mejor viajar a Máncora?",
        "De diciembre a abril es la temporada más cálida y soleada; el resto del año hay más viento y nubes.",
      ],
      TICKETS("¿Las actividades de playa están incluidas?"),
      CHANGE_DATE,
    ],
  },
};

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
  ([slug, name, region, image]) => {
    const d = detail[slug];
    return {
      id: seedId(`destination:${slug}`),
      slug,
      name,
      region,
      heroImageUrl: img(image),
      tagline: d.tagline,
      description: d.description,
      altitudeM: d.altitudeM,
      bestSeasonText: d.bestSeasonText,
      fromLimaText: d.fromLimaText,
      howToGetText: d.howToGetText,
      tipsText: d.tipsText,
    };
  },
);

export const seedDestinationClimateMonths: (typeof destinationClimateMonths.$inferInsert)[] =
  base.flatMap(([slug]) =>
    detail[slug].climate.map((season, i) => ({
      destinationId: seedId(`destination:${slug}`),
      month: i + 1,
      season,
    })),
  );

export const seedDestinationSights: (typeof destinationSights.$inferInsert)[] = base.flatMap(
  ([slug]) =>
    detail[slug].sights.map(([name, image, description, lat, lng], i) => ({
      id: seedId(`destination_sight:${slug}:${i + 1}`),
      destinationId: seedId(`destination:${slug}`),
      name,
      description,
      imageUrl: img(image),
      sortOrder: i + 1,
      lat,
      lng,
    })),
);

export const seedDestinationFaqs: (typeof destinationFaqs.$inferInsert)[] = base.flatMap(
  ([slug]) =>
    detail[slug].faqs.map(([question, answer], i) => ({
      id: seedId(`destination_faq:${slug}:${i + 1}`),
      destinationId: seedId(`destination:${slug}`),
      question,
      answer,
      sortOrder: i + 1,
    })),
);
