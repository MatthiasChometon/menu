import { jsonb, pgTable, text, timestamp, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';
import type { PlannedDay } from './type';

// One plan per account per week. The choices are stored, never the grammes:
// those are derived from the profile and the solver, so a stored copy would
// freeze figures that must follow the profile when it changes.
//
// The days are jsonb rather than a table of rows: a plan is read and written
// whole, never queried across, and a nested table would buy joins nobody needs.
export const weekPlan = pgTable(
  'week_plan',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // The Monday of the week, as YYYY-MM-DD — the same key the menus use.
    weekOf: text('week_of').notNull(),
    days: jsonb('days').$type<PlannedDay[]>().notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.weekOf] })],
);
