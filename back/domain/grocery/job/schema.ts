import { randomUUID } from 'node:crypto';
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { groceryDevice } from '../device/schema';
import { user } from '../../user/schema';
import { JobEventDetails } from './type';

// One request to fill a basket. Created by the site, picked up by whichever
// paired browser comes online next, so it outlives the tab that asked for it.
export const groceryJob = pgTable('grocery_job', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  weekOf: text('week_of').notNull(),
  // Stored as text so a new status costs no Postgres enum migration, as the
  // profile answers already are.
  status: text('status').notNull(),
  deviceId: uuid('device_id').references(() => groceryDevice.id, { onDelete: 'set null' }),
  // Copied from the preferences when the job is created: what the run was told
  // to warn above, not what the account happens to want today.
  alertThresholdCents: integer('alert_threshold_cents'),
  // Filled in when the run closes, so the report reads against what the shop
  // actually charged rather than against the estimate the menu carries.
  productsCents: integer('products_cents'),
  deliveryFeesCents: integer('delivery_fees_cents'),
  // What was still missing to reach the shop's order minimum. Above zero, the
  // basket cannot be ordered at all.
  shortOfMinimumCents: integer('short_of_minimum_cents'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
});

export const groceryJobEvent = pgTable('grocery_job_event', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  jobId: uuid('job_id')
    .notNull()
    .references(() => groceryJob.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  payload: jsonb('payload').$type<JobEventDetails>(),
  at: timestamp('at').notNull().defaultNow(),
});
