CREATE TABLE "grocery_basket_line" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"food_id" text NOT NULL,
	"label" text,
	"grams" integer NOT NULL,
	"from_pantry" integer NOT NULL,
	"ean" text,
	"product_name" text,
	"unit_size" integer,
	"units" integer
);
--> statement-breakpoint
CREATE TABLE "grocery_product" (
	"food_id" text PRIMARY KEY NOT NULL,
	"ean" text NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"packaging" text,
	"price_cents" integer,
	"observed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_device" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"token_hash" text NOT NULL,
	"paired_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp,
	CONSTRAINT "grocery_device_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "grocery_job" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"week_of" text NOT NULL,
	"status" text NOT NULL,
	"device_id" uuid,
	"alert_threshold_cents" integer,
	"products_cents" integer,
	"delivery_fees_cents" integer,
	"short_of_minimum_cents" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "grocery_job_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_pantry" (
	"user_id" uuid NOT NULL,
	"food_id" text NOT NULL,
	"grams" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grocery_pantry_user_id_food_id_pk" PRIMARY KEY("user_id","food_id")
);
--> statement-breakpoint
CREATE TABLE "grocery_preference" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"alert_threshold_cents" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_push_subscription" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grocery_push_subscription_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "grocery_slot_window" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_basket_line" ADD CONSTRAINT "grocery_basket_line_job_id_grocery_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."grocery_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_device" ADD CONSTRAINT "grocery_device_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_job" ADD CONSTRAINT "grocery_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_job" ADD CONSTRAINT "grocery_job_device_id_grocery_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."grocery_device"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_job_event" ADD CONSTRAINT "grocery_job_event_job_id_grocery_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."grocery_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_pantry" ADD CONSTRAINT "grocery_pantry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_preference" ADD CONSTRAINT "grocery_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_push_subscription" ADD CONSTRAINT "grocery_push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_slot_window" ADD CONSTRAINT "grocery_slot_window_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;