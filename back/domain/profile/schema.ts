import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';

// One profile per account: the enums are stored as text so a new answer can be
// added without a migration dance on a Postgres enum type.
export const profile = pgTable('profile', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
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
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
