import { randomUUID } from 'node:crypto';
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { groceryJob } from '../job/schema';

// What a run is meant to put in the basket, worked out when the run is queued.
// Frozen at that moment on purpose: the report has to be readable against what
// was asked for, not against a menu that has since been edited.
export const groceryBasketLine = pgTable('grocery_basket_line', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  jobId: uuid('job_id')
    .notNull()
    .references(() => groceryJob.id, { onDelete: 'cascade' }),
  foodId: text('food_id').notNull(),
  grams: integer('grams').notNull(),
  fromPantry: integer('from_pantry').notNull(),
  // Absent when no product is known for that food: the run has to search.
  ean: text('ean'),
  productName: text('product_name'),
  unitSize: integer('unit_size'),
  units: integer('units'),
});
