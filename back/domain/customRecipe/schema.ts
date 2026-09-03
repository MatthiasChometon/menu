import { randomUUID } from 'node:crypto';
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '../user/schema';

// Grammes by food id, the same shape the static recipes already use. Stored as
// an object rather than a table: a recipe is read and written whole, never
// queried ingredient by ingredient.
export type StoredIngredients = Record<string, number>;

// A recipe a reader wrote for themselves, alongside the site's own catalogue.
// Its macros are never stored here: they follow from its ingredients, which
// can point at a stocked food or one of the reader's own, so a stored total
// would drift the moment either changed.
export const customRecipe = pgTable('custom_recipe', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn((): string => randomUUID()),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slot: text('slot').notNull(),
  ingredients: jsonb('ingredients').$type<StoredIngredients>().notNull(),
  steps: jsonb('steps').$type<string[]>().notNull(),
  prepMinutes: integer('prep_minutes').notNull(),
  batch: boolean('batch').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
