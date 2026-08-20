import { integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../../user/schema';

// What is left in the cupboard once a week has been cooked, so the next order
// does not buy a second bag of rice for the 40 g that were still there.
export const groceryPantry = pgTable(
  'grocery_pantry',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    foodId: text('food_id').notNull(),
    grams: integer('grams').notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.foodId] })],
);
