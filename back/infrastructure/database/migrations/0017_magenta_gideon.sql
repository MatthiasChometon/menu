ALTER TABLE "grocery_job" ADD COLUMN "claim_key" uuid;--> statement-breakpoint
ALTER TABLE "grocery_job" ADD CONSTRAINT "grocery_job_device_claim_key_unique" UNIQUE("device_id","claim_key");