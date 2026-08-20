CREATE TABLE "household_member" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sex" text NOT NULL,
	"age" integer NOT NULL,
	"height_cm" integer NOT NULL,
	"weight_kg" integer NOT NULL,
	"daily_activity" text NOT NULL,
	"training_days_per_week" integer NOT NULL,
	"training_type" text NOT NULL,
	"starch_quality" text NOT NULL,
	"appetite" text NOT NULL,
	"goal" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;