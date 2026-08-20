CREATE TABLE "grocery_basket_line" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"food_id" text NOT NULL,
	"grams" integer NOT NULL,
	"from_pantry" integer NOT NULL,
	"ean" text,
	"product_name" text,
	"unit_size" integer,
	"units" integer
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
ALTER TABLE "grocery_basket_line" ADD CONSTRAINT "grocery_basket_line_job_id_grocery_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."grocery_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_pantry" ADD CONSTRAINT "grocery_pantry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;