CREATE TABLE "profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;