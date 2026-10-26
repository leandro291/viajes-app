export type OfferKind = "last_minute" | "rainy_season" | "groups";
export type DiscountType = "percent" | "two_for_one";

export type OfferTerms = {
  discountType: DiscountType;
  discountValue: number | null; // porcentaje 1–100; null si two_for_one
  minPeople: number | null;
};

export type OfferDto = OfferTerms & {
  id: string;
  kind: OfferKind;
  validUntil: string | null; // ISO 8601 (serializable en la caché)
  package: {
    id: string;
    slug: string;
    title: string;
    durationDays: number;
    priceCents: number; // por persona, PEN
    coverImageUrl: string | null;
    region: string; // destinations.region (D15)
  };
};
