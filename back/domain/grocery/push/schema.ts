import { randomUUID } from 'node:crypto';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../../user/schema';

// One browser or phone that agreed to be told. The endpoint is minted by the
// push service, not by us, and is unique per device.
export const groceryPushSubscription = pgTable('grocery_push_subscription', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
