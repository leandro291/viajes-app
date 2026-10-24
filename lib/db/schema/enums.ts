import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["super_admin", "admin", "organizer", "customer"]);
export const organizerStatus = pgEnum("organizer_status", ["pending", "active", "suspended"]);
export const packageKind = pgEnum("package_kind", ["package", "day_tour"]);
export const publishStatus = pgEnum("publish_status", ["draft", "published"]);
export const inclusionKind = pgEnum("inclusion_kind", ["included", "excluded"]);
export const season = pgEnum("season", ["dry", "mixed", "rainy"]);
export const departureStatus = pgEnum("departure_status", [
  "scheduled",
  "en_route",
  "completed",
  "cancelled",
]);
export const offerKind = pgEnum("offer_kind", ["last_minute", "rainy_season", "groups"]);
export const discountType = pgEnum("discount_type", ["percent", "two_for_one"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "confirmed", "cancelled"]);
export const docType = pgEnum("doc_type", ["dni", "passport", "foreign_id"]);
export const paymentMethod = pgEnum("payment_method", ["card", "yape", "plin", "cash"]);
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
]);
export const notificationKey = pgEnum("notification_key", [
  "new_booking",
  "cancellations",
  "weekly_summary",
]);
