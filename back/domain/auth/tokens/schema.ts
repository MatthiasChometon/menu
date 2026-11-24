import { pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { user } from '../../user/schema';
import type { AuthTokenType } from './type';

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
    type: text('type').$type<AuthTokenType>().notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.type] }),
    // Looked up by hash when a link is followed; the hash is also what makes one
    // link open one account only.
    uniqueIndex('auth_token_token_hash_unique').on(table.tokenHash),
  ],
);
