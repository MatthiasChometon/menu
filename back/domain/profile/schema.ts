import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';

// One profile per account: the enums are stored as text so a new answer can be
// added without a migration dance on a Postgres enum type.
export const profile = pgTable('profile', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
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
  // A manual nudge on top of the calculated kcal target — what the weight
  // coach's "adjust my targets" action moves. Left untouched when the profile
  // is re-saved through the onboarding form: editing an answer should not
  // silently discard a nudge the person accepted.
  kcalAdjustment: integer('kcal_adjustment').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
