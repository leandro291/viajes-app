// Entrada pura de offers (sin acceso a la DB): el barrel falla sin DATABASE_URL. La usa payments.
export { calculateOffer } from "./utils/offer-pricing";
export type { OfferPricing, OfferPricingInput } from "./utils/offer-pricing";
export type { OfferTerms, DiscountType } from "./types/offer";
