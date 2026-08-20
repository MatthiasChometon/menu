CREATE TABLE "bug_report" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bug_report" ADD CONSTRAINT "bug_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;