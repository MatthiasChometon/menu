import { randomUUID } from 'node:crypto';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';
import type { SuggestionContext } from './type';

// An idea somebody had while using the site, kept whole. Sibling to bug_report:
// the same shape, a different intent — one says something is broken, this one
// says something is missing. Its own table because a suggestion has its own life
// (planned, shipped, set aside) that a bug never has.
//
// The account is remembered so a suggestion can be answered, but set null rather
// than cascade — a closed account is no reason to lose a good idea. The context
// is jsonb for the same reason as bug_report: read as one block, never queried
// across, and free to grow without a migration.
export const improvementRequest = pgTable('improvement_request', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
  importance: text('importance').notNull(),
  message: text('message').notNull(),
  context: jsonb('context').$type<SuggestionContext>().notNull(),
  status: text('status').notNull().default('NEW'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
