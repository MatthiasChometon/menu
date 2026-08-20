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
