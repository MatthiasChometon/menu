CREATE TABLE "report_block" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"blocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_block" ADD CONSTRAINT "report_block_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;