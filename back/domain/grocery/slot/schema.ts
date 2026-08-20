import { randomUUID } from 'node:crypto';
import { integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import { user } from '../../user/schema';

// What a run may book, one row per acceptable window. No row at all means no
// window is acceptable, so nothing is booked and the run only reports what was
// on offer.
export const grocerySlotWindow = pgTable('grocery_slot_window', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // 1 is Monday, 7 is Sunday, as ISO 8601 numbers them.
  weekday: integer('weekday').notNull(),
  startMinute: integer('start_minute').notNull(),
  endMinute: integer('end_minute').notNull(),
});
