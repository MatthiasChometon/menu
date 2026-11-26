CREATE INDEX "custom_food_user_idx" ON "custom_food" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "custom_recipe_user_idx" ON "custom_recipe" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "weight_user_date_idx" ON "weight" USING btree ("user_id","date");