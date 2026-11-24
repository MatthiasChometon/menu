CREATE INDEX "grocery_basket_line_job_idx" ON "grocery_basket_line" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "grocery_device_user_idx" ON "grocery_device" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "grocery_job_user_status_created_idx" ON "grocery_job" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "grocery_job_device_idx" ON "grocery_job" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "grocery_job_event_job_at_idx" ON "grocery_job_event" USING btree ("job_id","at");--> statement-breakpoint
CREATE INDEX "grocery_push_subscription_user_idx" ON "grocery_push_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "grocery_slot_window_user_idx" ON "grocery_slot_window" USING btree ("user_id");