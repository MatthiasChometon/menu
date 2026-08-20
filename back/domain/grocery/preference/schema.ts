import { integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../../user/schema';

export const groceryPreference = pgTable('grocery_preference', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  // Warn above this total. Null means never warn.
  alertThresholdCents: integer('alert_threshold_cents'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
