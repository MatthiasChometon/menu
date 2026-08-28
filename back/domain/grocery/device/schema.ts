import { randomUUID } from 'node:crypto';
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../../user/schema';

// A browser that has been paired with an account and may run its orders. The
// pairing secret is only ever stored hashed: it is shown once, at pairing time.
export const groceryDevice = pgTable('grocery_device', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  pairedAt: timestamp('paired_at').notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at'),
  // Whether the extension last found this browser signed in to Carrefour, and
  // when it looked — so the order page can show the state without opening the shop.
  carrefourSignedIn: boolean('carrefour_signed_in'),
  carrefourCheckedAt: timestamp('carrefour_checked_at'),
});
