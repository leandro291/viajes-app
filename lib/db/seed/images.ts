const DELSO = "Diego Delso, CC BY-SA 4.0";

const CREDITS = {
  mp: DELSO,
  mp2: DELSO,
  vin: "Yifan Wang, CC BY 2.0",
  hua: DELSO,
  tam: "Bhasker Thodla, CC BY 3.0",
  l69: "Renata Maria Cristina, CC BY-SA 4.0",
  uro: DELSO,
  cus: DELSO,
  col: "Thomas Fuhrmann, CC BY-SA 4.0",
  lim: "César Torales, CC BY-SA 4.0",
  bal: "Pierre André Leclercq, CC BY-SA 4.0",
  are: DELSO,
  man: "Charles Gadbois, CC BY 3.0",
  par: DELSO,
  sac: DELSO,
  pis: DELSO,
  tren: "Sashimi-b, CC BY-SA 4.0",
  agc: DELSO,
} as const;

export type SeedImageKey = keyof typeof CREDITS;

export const SEED_IMAGES: Record<SeedImageKey, { path: string; credit: string }> =
  Object.fromEntries(
    (Object.keys(CREDITS) as SeedImageKey[]).map((key) => [
      key,
      { path: `/seed/${key}.jpg`, credit: CREDITS[key] },
    ]),
  ) as Record<SeedImageKey, { path: string; credit: string }>;
