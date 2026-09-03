import { randomUUID } from 'node:crypto';
import { pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';

// A food a reader defined for themselves, alongside the site's own catalogue.
// Macros are per 100 g, the same basis the static content uses, so a recipe
// can weigh a custom food exactly like a stocked one.
export const customFood = pgTable('custom_food', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  kcal: real('kcal').notNull(),
  protein: real('protein').notNull(),
  fat: real('fat').notNull(),
  carbs: real('carbs').notNull(),
  fiber: real('fiber').notNull(),
  pricePerKg: real('price_per_kg').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
