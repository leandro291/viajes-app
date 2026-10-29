import type { OrganizerScope } from "@/modules/packages";

import type { DiscountType, OfferKind } from "./offer";

export type OfferScope = OrganizerScope | "all"; // "all": uso futuro de admin (027)

export type OwnOfferItem = {
  id: string;
  packageId: string;
  packageTitle: string;
  packageStatus: "draft" | "published";
  packageMaxGroupSize: number;
  kind: OfferKind;
  discountType: DiscountType;
  discountValue: number | null;
  minPeople: number | null;
  validUntil: Date | null;
  isActive: boolean;
};

export type OfferFormOptions = {
  packages: {
    id: string;
    title: string;
    status: "draft" | "published";
    maxGroupSize: number;
  }[];
};
