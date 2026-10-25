export const CACHE_TAGS = {
  packages: "packages",
  destinations: "destinations",
  categories: "categories",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
