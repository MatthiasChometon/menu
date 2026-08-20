import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';

// Somebody the account holder cooks for. Not an account: these are cards their
// owner fills in and edits, and nobody signs in as one.
//
// The measurement columns mirror `profile` on purpose rather than sharing a
// table with it. A profile belongs to whoever is signed in and is the answer to
// "what should I eat"; a member belongs to somebody else's household and is the
// answer to "who else am I weighing for". Merging them would mean a row that is
// sometimes an account and sometimes a name on a list.
export const householdMember = pgTable('household_member', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sex: text('sex').notNull(),
  age: integer('age').notNull(),
  heightCm: integer('height_cm').notNull(),
  weightKg: integer('weight_kg').notNull(),
  dailyActivity: text('daily_activity').notNull(),
  trainingDaysPerWeek: integer('training_days_per_week').notNull(),
  trainingType: text('training_type').notNull(),
  starchQuality: text('starch_quality').notNull(),
  appetite: text('appetite').notNull(),
  goal: text('goal').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
