import { randomUUID } from 'node:crypto';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  // Minted here rather than by the database. defaultRandom() compiles to
  // gen_random_uuid(), which Postgres only carries built in from 13: the
  // host runs 9.6 and has neither that function nor the pgcrypto extension
  // that would supply it, so the CREATE TABLE itself would be refused.
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  // Null for accounts created through Google: they never set one.
  passwordHash: text('password_hash'),
  // Null until the account is linked to Google. Unique on its own, and Postgres
  // allows many nulls under a unique constraint.
  googleId: text('google_id').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
