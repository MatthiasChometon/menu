CREATE TABLE "grocery_preference" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"alert_threshold_cents" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_job" ADD COLUMN "products_cents" integer;--> statement-breakpoint
ALTER TABLE "grocery_job" ADD COLUMN "delivery_fees_cents" integer;--> statement-breakpoint
ALTER TABLE "grocery_job" ADD COLUMN "short_of_minimum_cents" integer;--> statement-breakpoint
ALTER TABLE "grocery_preference" ADD CONSTRAINT "grocery_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;