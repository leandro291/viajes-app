import { bookings, bookingTravelers, payments } from "../../schema";
import { applyOffer, limaDate, penToUsdCents, seedId, SEED_PEN_PER_USD } from "../helpers";
import { seedOffers } from "./schedule";
import { seedPackages } from "./packages";
import { seedUsers } from "./identity";

type Row = {
  code: string;
  customer: string;
  slug: string;
  departure: string;
  pax: number;
  offer: boolean;
  method: "card" | "yape" | "plin" | "cash";
  status: "pending" | "confirmed" | "cancelled";
  created: string;
};

const rows: Row[] = [
  { code: "WY-4821", customer: "seed_customer_01", slug: "machu-picchu-magico", departure: "2026-11-05T07:30", pax: 2, offer: false, method: "card", status: "confirmed", created: "2026-10-21" },
  { code: "WY-4820", customer: "seed_customer_08", slug: "montana-de-colores", departure: "2026-11-02T04:00", pax: 4, offer: false, method: "yape", status: "pending", created: "2026-10-12" },
  { code: "WY-4819", customer: "seed_customer_02", slug: "amazonia-tambopata", departure: "2026-11-12T08:00", pax: 2, offer: true, method: "card", status: "confirmed", created: "2026-10-20" },
  { code: "WY-4818", customer: "seed_customer_07", slug: "islas-ballestas", departure: "2026-10-30T08:00", pax: 3, offer: false, method: "plin", status: "confirmed", created: "2026-10-14" },
  { code: "WY-4817", customer: "seed_customer_05", slug: "titicaca-islas-uros", departure: "2026-11-08T08:00", pax: 2, offer: true, method: "card", status: "cancelled", created: "2026-10-17" },
  { code: "WY-4816", customer: "seed_customer_03", slug: "paracas-huacachina", departure: "2026-11-15T08:00", pax: 5, offer: true, method: "cash", status: "pending", created: "2026-10-19" },
  { code: "WY-4815", customer: "seed_customer_04", slug: "canon-del-colca", departure: "2026-11-19T08:00", pax: 2, offer: false, method: "yape", status: "confirmed", created: "2026-10-18" },
  { code: "WY-4814", customer: "seed_customer_06", slug: "machu-picchu-en-un-dia", departure: "2026-10-27T04:30", pax: 1, offer: false, method: "card", status: "confirmed", created: "2026-10-15" },
];

const userByClerkId = new Map(seedUsers.map((u) => [u.clerkId, u]));
const packageBySlug = new Map(seedPackages.map((p) => [p.slug, p]));
const offerByPackageId = new Map(seedOffers.map((o) => [o.packageId, o]));

const computed = rows.map((r, i) => {
  const customer = userByClerkId.get(r.customer)!;
  const pkg = packageBySlug.get(r.slug)!;
  const offer = r.offer ? offerByPackageId.get(pkg.id!)! : undefined;
  const unitPriceCents = pkg.priceCents;
  const pricing = offer
    ? applyOffer({
        unitCents: unitPriceCents,
        pax: r.pax,
        discountType: offer.discountType,
        discountValue: offer.discountValue ?? null,
        minPeople: offer.minPeople ?? null,
      })
    : { discountCents: 0, totalCents: unitPriceCents * r.pax };
  return { r, n: i + 1, customer, pkg, offer, unitPriceCents, ...pricing, createdAt: limaDate(r.created, "12:00") };
});

export const seedBookings: (typeof bookings.$inferInsert)[] = computed.map(
  ({ r, customer, pkg, offer, unitPriceCents, discountCents, totalCents, createdAt }) => ({
    id: seedId(`booking:${r.code}`),
    code: r.code,
    customerId: customer.id!,
    packageId: pkg.id!,
    departureId: seedId(`departure:${r.slug}:${r.departure}`),
    offerId: offer?.id ?? null,
    status: r.status,
    paxCount: r.pax,
    unitPriceCents,
    discountCents,
    totalCents,
    currency: "PEN",
    exchangeRate: SEED_PEN_PER_USD,
    contactEmail: customer.email,
    contactPhone: customer.phone!,
    termsAcceptedAt: createdAt,
    cancelledAt: r.status === "cancelled" ? limaDate("2026-10-19", "10:00") : null,
    createdAt,
  }),
);

export const seedBookingTravelers: (typeof bookingTravelers.$inferInsert)[] = [
  ...computed.map(({ r, n, customer }) => {
    const peruvian = customer.country === "Perú";
    return {
      id: seedId(`traveler:${r.code}:1`),
      bookingId: seedId(`booking:${r.code}`),
      firstName: customer.firstName!,
      lastName: customer.lastName!,
      docType: peruvian ? ("dni" as const) : ("passport" as const),
      docNumber: peruvian ? `9000000${n}` : `SEEDPP0${n}`,
      isPrimary: true,
    };
  }),
  {
    id: seedId("traveler:WY-4821:2"),
    bookingId: seedId("booking:WY-4821"),
    firstName: "Pedro",
    lastName: "Quispe",
    docType: "dni",
    docNumber: "90000009",
    isPrimary: false,
  },
];

export const seedPayments: (typeof payments.$inferInsert)[] = computed.map(
  ({ r, totalCents, createdAt }) => {
    const amountCents = penToUsdCents(totalCents, SEED_PEN_PER_USD);
    const status =
      r.status === "pending" ? "pending" : r.status === "cancelled" ? "refunded" : "succeeded";
    const card = r.method === "card";
    return {
      id: seedId(`payment:${r.code}`),
      bookingId: seedId(`booking:${r.code}`),
      provider: "stripe",
      method: r.method,
      status,
      amountCents,
      currency: "USD",
      stripeCheckoutSessionId: card ? `cs_test_seed_${r.code}` : null,
      stripePaymentIntentId: card ? `pi_seed_${r.code}` : null,
      refundedCents: status === "refunded" ? amountCents : 0,
      paidAt: status === "pending" ? null : new Date(createdAt.getTime() + 5 * 60_000),
      createdAt,
    };
  },
);
