import { departures as departuresTable, offers as offersTable } from "../../schema";
import { limaDate, seedId, SEED_ANCHOR } from "../helpers";
import { seedPackages } from "./packages";

type OfferRow = [
  slug: string,
  kind: "last_minute" | "rainy_season" | "groups",
  value: number | null,
  validUntil: string,
  isActive: boolean,
  minPeople?: number,
];

const offerRows: OfferRow[] = [
  ["amazonia-tambopata", "rainy_season", 25, "2026-11-30", true],
  ["machu-picchu-magico", "last_minute", 15, "2026-11-10", true],
  ["islas-ballestas", "groups", null, "2026-12-31", true],
  ["mancora-sol-y-playa", "last_minute", 30, "2026-11-15", false],
  ["titicaca-islas-uros", "rainy_season", 20, "2026-12-31", true],
  ["canon-del-colca", "last_minute", 10, "2026-11-08", false],
  ["paracas-huacachina", "groups", 20, "2026-12-31", true, 4],
  ["laguna-69-huaraz", "rainy_season", 15, "2026-12-31", true],
];

export const seedOffers: (typeof offersTable.$inferInsert)[] = offerRows.map(
  ([slug, kind, value, validUntil, isActive, minPeople]) => ({
    id: seedId(`offer:${slug}`),
    packageId: seedId(`package:${slug}`),
    kind,
    discountType: value === null ? "two_for_one" : "percent",
    discountValue: value,
    minPeople: minPeople ?? null,
    validUntil: limaDate(validUntil, "23:59"),
    isActive,
  }),
);

type Slot = {
  slug: string;
  date: string;
  time: string;
  guide?: string;
  status?: "en_route";
  bookedSeats?: number;
};

const todaySlots: Slot[] = [
  { slug: "montana-de-colores", date: SEED_ANCHOR, time: "05:30", guide: "wilber-c", status: "en_route", bookedSeats: 14 },
  { slug: "machu-picchu-en-un-dia", date: SEED_ANCHOR, time: "06:10", guide: "rocio-m", status: "en_route", bookedSeats: 9 },
  { slug: "islas-ballestas", date: SEED_ANCHOR, time: "08:00", guide: "ivan-p", bookedSeats: 22 },
  { slug: "buggy-sandboard-huacachina", date: SEED_ANCHOR, time: "15:30", guide: "kiara-s", bookedSeats: 11 },
];

const bookingSlots: Slot[] = [
  { slug: "machu-picchu-magico", date: "2026-11-05", time: "07:30", bookedSeats: 2 },
  { slug: "montana-de-colores", date: "2026-11-02", time: "04:00" },
  { slug: "amazonia-tambopata", date: "2026-11-12", time: "08:00", bookedSeats: 2 },
  { slug: "islas-ballestas", date: "2026-10-30", time: "08:00", bookedSeats: 3 },
  { slug: "titicaca-islas-uros", date: "2026-11-08", time: "08:00" },
  { slug: "paracas-huacachina", date: "2026-11-15", time: "08:00" },
  { slug: "canon-del-colca", date: "2026-11-19", time: "08:00", bookedSeats: 2 },
  { slug: "machu-picchu-en-un-dia", date: "2026-10-27", time: "04:30", bookedSeats: 1 },
];

const MPM = "machu-picchu-magico";

const thursdaySlots: Slot[] = [
  ...["2026-11-05", "2026-11-12", "2026-11-19", "2026-11-26"].map((date) => ({
    slug: MPM,
    date,
    time: "07:30",
  })),
  ...seedPackages
    .filter((p) => p.slug !== MPM)
    .flatMap((p) =>
      ["2026-11-05", "2026-11-19"].map((date) => ({
        slug: p.slug,
        date,
        time: p.startTime ?? "08:00",
      })),
    ),
];

const packageBySlug = new Map(seedPackages.map((p) => [p.slug, p]));
const slotsByKey = new Map<string, Slot>();
for (const slot of [...todaySlots, ...bookingSlots, ...thursdaySlots]) {
  const key = `${slot.slug}:${slot.date}T${slot.time}`;
  if (!slotsByKey.has(key)) slotsByKey.set(key, slot);
}

export const seedDepartures: (typeof departuresTable.$inferInsert)[] = [...slotsByKey].map(
  ([key, slot]) => ({
    id: seedId(`departure:${key}`),
    packageId: seedId(`package:${slot.slug}`),
    guideId: slot.guide ? seedId(`guide:${slot.guide}`) : null,
    startsAt: limaDate(slot.date, slot.time),
    capacity: packageBySlug.get(slot.slug)!.maxGroupSize!,
    bookedSeats: slot.bookedSeats ?? 0,
    status: slot.status ?? "scheduled",
  }),
);
