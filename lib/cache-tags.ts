export const CACHE_TAGS = {
  packages: "packages",
  destinations: "destinations",
  categories: "categories",
  departures: "departures",
  offers: "offers",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
