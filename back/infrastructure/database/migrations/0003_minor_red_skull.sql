CREATE TABLE "week_plan" (
	"user_id" uuid NOT NULL,
	"week_of" text NOT NULL,
	"days" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "week_plan_user_id_week_of_pk" PRIMARY KEY("user_id","week_of")
);
--> statement-breakpoint
ALTER TABLE "week_plan" ADD CONSTRAINT "week_plan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;