import { randomUUID } from 'node:crypto';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';
import type { ReportContext } from './type';

// What somebody ran into, kept whole. The account is remembered so a report can
// be answered, but the report outlives the account: set null rather than cascade
// — a closed account is no reason to lose the bug it found.
//
// The context is jsonb rather than columns because it is read as one block by a
// person looking at a report, never queried across, and because what is worth
// capturing will change without any of it deserving a migration.
export const bugReport = pgTable('bug_report', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
  severity: text('severity').notNull(),
  message: text('message').notNull(),
  context: jsonb('context').$type<ReportContext>().notNull(),
  status: text('status').notNull().default('NEW'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// An account the site no longer accepts reports from. Its own table rather than
// a column on the account: whether somebody may file a report is this slice's
// business, and the user model has no reason to learn about it.
//
// A row here silences reporting and nothing else. It is not a ban from the
// site: the profile, the weeks and the recipes stay exactly where they were,
// because being a nuisance in one place is no reason to lose your own data.
export const reportBlock = pgTable('report_block', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  blockedAt: timestamp('blocked_at').notNull().defaultNow(),
});
