import { randomUUID } from 'node:crypto';
import { date, pgTable, real, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';

// One diary row per weigh-in. Several entries can share a date (nothing stops
// somebody weighing in twice), so there is no unique constraint on the pair —
// the list is ordered, never deduplicated.
export const weight = pgTable('weight', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  date: date('date', { mode: 'string' }).notNull(),
  kg: real('kg').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
