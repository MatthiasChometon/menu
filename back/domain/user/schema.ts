import { randomUUID } from 'node:crypto';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  // Null until the address has been proven. Sign-in refuses to hand out a
  // session while it is null, which is what makes the check worth anything:
  // an unverified account is one anybody could have opened with somebody
  // else's address.
  emailVerifiedAt: timestamp('email_verified_at'),
  // The language the account was opened in. Verification and reminders are sent
  // from a request that often carries nothing but an email address, so the
  // language has to be remembered rather than read off the caller.
  locale: text('locale').notNull().default('fr'),
  // Bumped whenever every existing session has to stop working — a password
  // reset, today. A JWT cannot be recalled once signed, so the token carries
  // this number and the guard refuses anything stale.
  //
  // A counter rather than a moment in time: a JWT records its issue time in
  // whole seconds, so a reset landing in the same second as the session it
  // means to cut would leave that session alive. A number has no such edge.
  // Set when the account is shut out of the site. Checked by the guard every
  // authenticated call goes through, so blocking takes effect everywhere at
  // once rather than in the one place somebody remembered to check.
  blockedAt: timestamp('blocked_at'),
  sessionVersion: integer('session_version').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
