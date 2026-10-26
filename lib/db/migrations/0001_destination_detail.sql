ALTER TABLE "destination_sights" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "destination_sights" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "how_to_get_text" text;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "tips_text" text;