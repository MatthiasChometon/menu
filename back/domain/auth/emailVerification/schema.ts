import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../../user/schema';

// A one-time link, stored as a hash. The token in the email is the only copy
// that can open anything: a dump of this table lets nobody verify an address,
// the same reason passwords are not stored either.
//
// SHA-256 rather than scrypt, deliberately: the token is 32 random bytes, so
// there is no dictionary to slow an attacker down through — only a hash to make
// the stored value useless.
//
// The primary key is (user, type), which is the rule "one live link per person
// per purpose" written where it cannot be forgotten: issuing a new one replaces
// the old, so a link that was mailed twice does not leave two doors open.
export const authToken = pgTable(
  'auth_token',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.type] })],
);
