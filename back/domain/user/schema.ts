import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  // Null for accounts created through Google: they never set one.
  passwordHash: text('password_hash'),
  // Null until the account is linked to Google. Unique on its own, and Postgres
  // allows many nulls under a unique constraint.
  googleId: text('google_id').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
