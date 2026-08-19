CREATE TABLE "auth_token" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "auth_token_user_id_type_pk" PRIMARY KEY("user_id","type")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "locale" text DEFAULT 'fr' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_token" ADD CONSTRAINT "auth_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Google already proved these addresses; leaving them null would say the
-- opposite, and would lock the account out the day its owner sets a password.
UPDATE "user" SET "email_verified_at" = now() WHERE "google_id" IS NOT NULL;
