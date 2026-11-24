import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from '../profile/enum';
import { user } from '../user/schema';

// Somebody the account holder cooks for. Not an account: these are cards their
// owner fills in and edits, and nobody signs in as one.
//
// The measurement columns mirror `profile` on purpose rather than sharing a
// table with it. A profile belongs to whoever is signed in and is the answer to
// "what should I eat"; a member belongs to somebody else's household and is the
// answer to "who else am I weighing for". Merging them would mean a row that is
// sometimes an account and sometimes a name on a list.
export const householdMember = pgTable(
  'household_member',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sex: text('sex').$type<Sex>().notNull(),
    age: integer('age').notNull(),
    heightCm: integer('height_cm').notNull(),
    weightKg: integer('weight_kg').notNull(),
    dailyActivity: text('daily_activity').$type<DailyActivity>().notNull(),
    trainingDaysPerWeek: integer('training_days_per_week').notNull(),
    trainingType: text('training_type').$type<TrainingType>().notNull(),
    starchQuality: text('starch_quality').$type<StarchQuality>().notNull(),
    appetite: text('appetite').$type<Appetite>().notNull(),
    goal: text('goal').$type<Goal>().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  // Every read, update and delete is scoped by owner.
  (table) => [index('household_member_owner_id_idx').on(table.ownerId)],
);
