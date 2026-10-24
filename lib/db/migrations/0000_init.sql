CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."departure_status" AS ENUM('scheduled', 'en_route', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percent', 'two_for_one');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('dni', 'passport', 'foreign_id');--> statement-breakpoint
CREATE TYPE "public"."inclusion_kind" AS ENUM('included', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."notification_key" AS ENUM('new_booking', 'cancellations', 'weekly_summary');--> statement-breakpoint
CREATE TYPE "public"."offer_kind" AS ENUM('last_minute', 'rainy_season', 'groups');--> statement-breakpoint
CREATE TYPE "public"."organizer_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."package_kind" AS ENUM('package', 'day_tour');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'yape', 'plin', 'cash');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."season" AS ENUM('dry', 'mixed', 'rainy');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin', 'organizer', 'customer');--> statement-breakpoint
CREATE SEQUENCE "public"."booking_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9999 START WITH 4822 CACHE 1;--> statement-breakpoint
CREATE TABLE "booking_travelers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"doc_type" "doc_type" NOT NULL,
	"doc_number" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text DEFAULT 'WY-' || lpad(nextval('booking_code_seq')::text, 4, '0') NOT NULL,
	"customer_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"departure_id" uuid NOT NULL,
	"offer_id" uuid,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"pax_count" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"discount_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'PEN' NOT NULL,
	"exchange_rate" numeric(8, 4) NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_code_unique" UNIQUE("code"),
	CONSTRAINT "bookings_code_format_check" CHECK ("bookings"."code" ~ '^WY-[0-9]{4}$'),
	CONSTRAINT "bookings_pax_count_check" CHECK ("bookings"."pax_count" > 0),
	CONSTRAINT "bookings_discount_cents_check" CHECK ("bookings"."discount_cents" >= 0),
	CONSTRAINT "bookings_total_cents_check" CHECK ("bookings"."total_cents" = "bookings"."unit_price_cents" * "bookings"."pax_count" - "bookings"."discount_cents"),
	CONSTRAINT "bookings_exchange_rate_check" CHECK ("bookings"."exchange_rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "departures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"guide_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"booked_seats" integer DEFAULT 0 NOT NULL,
	"status" "departure_status" DEFAULT 'scheduled' NOT NULL,
	CONSTRAINT "departures_package_starts_at_unique" UNIQUE("package_id","starts_at"),
	CONSTRAINT "departures_booked_seats_check" CHECK ("departures"."booked_seats" >= 0 and "departures"."booked_seats" <= "departures"."capacity"),
	CONSTRAINT "departures_capacity_check" CHECK ("departures"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destination_climate_months" (
	"destination_id" uuid NOT NULL,
	"month" smallint NOT NULL,
	"season" "season" NOT NULL,
	CONSTRAINT "destination_climate_months_destination_id_month_pk" PRIMARY KEY("destination_id","month"),
	CONSTRAINT "destination_climate_months_month_check" CHECK ("destination_climate_months"."month" between 1 and 12)
);
--> statement-breakpoint
CREATE TABLE "destination_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destination_sights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"tagline" text,
	"description" text,
	"altitude_m" integer,
	"best_season_text" text,
	"from_lima_text" text,
	"hero_image_url" text,
	CONSTRAINT "destinations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid NOT NULL,
	"key" "notification_key" NOT NULL,
	"enabled" boolean NOT NULL,
	CONSTRAINT "notification_preferences_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "organizers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"ruc" text NOT NULL,
	"whatsapp" text NOT NULL,
	"status" "organizer_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"country" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "package_categories" (
	"package_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "package_categories_package_id_category_id_pk" PRIMARY KEY("package_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "package_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"credit" text,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_inclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"kind" "inclusion_kind" NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_itinerary_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"place" text NOT NULL,
	"transport_leg" text,
	"image_url" text,
	"lat" double precision,
	"lng" double precision,
	CONSTRAINT "package_itinerary_days_package_day_unique" UNIQUE("package_id","day_number")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	"kind" "package_kind" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"blurb" text NOT NULL,
	"description" text,
	"duration_days" integer NOT NULL,
	"nights" integer NOT NULL,
	"duration_hours" integer,
	"start_time" time,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'PEN' NOT NULL,
	"max_group_size" integer NOT NULL,
	"languages" text[] NOT NULL,
	"meeting_point" text,
	"meeting_lat" double precision,
	"meeting_lng" double precision,
	"cover_image_url" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_slug_unique" UNIQUE("slug"),
	CONSTRAINT "packages_price_cents_check" CHECK ("packages"."price_cents" >= 0),
	CONSTRAINT "packages_duration_days_check" CHECK ("packages"."duration_days" >= 1),
	CONSTRAINT "packages_nights_check" CHECK ("packages"."nights" >= 0),
	CONSTRAINT "packages_max_group_size_check" CHECK ("packages"."max_group_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"kind" "offer_kind" NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer,
	"min_people" integer,
	"valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_discount_check" CHECK (("offers"."discount_type" = 'two_for_one' and "offers"."discount_value" is null) or ("offers"."discount_type" = 'percent' and "offers"."discount_value" between 1 and 100))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_stripe_checkout_session_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "payments_amount_cents_check" CHECK ("payments"."amount_cents" >= 0),
	CONSTRAINT "payments_refunded_cents_check" CHECK ("payments"."refunded_cents" between 0 and "payments"."amount_cents")
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "booking_travelers" ADD CONSTRAINT "booking_travelers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_departure_id_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."departures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departures" ADD CONSTRAINT "departures_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departures" ADD CONSTRAINT "departures_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_climate_months" ADD CONSTRAINT "destination_climate_months_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_faqs" ADD CONSTRAINT "destination_faqs_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_sights" ADD CONSTRAINT "destination_sights_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizers" ADD CONSTRAINT "organizers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_categories" ADD CONSTRAINT "package_categories_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_categories" ADD CONSTRAINT "package_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_images" ADD CONSTRAINT "package_images_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_inclusions" ADD CONSTRAINT "package_inclusions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_itinerary_days" ADD CONSTRAINT "package_itinerary_days_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_travelers_booking_idx" ON "booking_travelers" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_travelers_primary_unique" ON "booking_travelers" USING btree ("booking_id") WHERE "booking_travelers"."is_primary";--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_departure_idx" ON "bookings" USING btree ("departure_id");--> statement-breakpoint
CREATE INDEX "bookings_package_status_idx" ON "bookings" USING btree ("package_id","status");--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "departures_starts_at_idx" ON "departures" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "departures_guide_idx" ON "departures" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "guides_organizer_idx" ON "guides" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "destination_faqs_destination_sort_idx" ON "destination_faqs" USING btree ("destination_id","sort_order");--> statement-breakpoint
CREATE INDEX "destination_sights_destination_sort_idx" ON "destination_sights" USING btree ("destination_id","sort_order");--> statement-breakpoint
CREATE INDEX "package_images_package_sort_idx" ON "package_images" USING btree ("package_id","sort_order");--> statement-breakpoint
CREATE INDEX "package_inclusions_package_kind_sort_idx" ON "package_inclusions" USING btree ("package_id","kind","sort_order");--> statement-breakpoint
CREATE INDEX "packages_status_kind_idx" ON "packages" USING btree ("status","kind");--> statement-breakpoint
CREATE INDEX "packages_destination_idx" ON "packages" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "packages_organizer_idx" ON "packages" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "offers_package_active_idx" ON "offers" USING btree ("package_id","is_active");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");