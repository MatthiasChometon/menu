import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Which real product stands for a food of the menu. The EAN is the key the shop
// itself accepts, so it is the primary key rather than a surrogate id.
export const groceryProduct = pgTable('grocery_product', {
  foodId: text('food_id').primaryKey(),
  ean: text('ean').notNull(),
  name: text('name').notNull(),
  // Usable content of one unit, in grams or millilitres. What the menu counts.
  size: integer('size').notNull(),
  // What the shop displays, kept verbatim: "the 3 tins of 400g". It is the only
  // way to tell later why a size was read as it was.
  packaging: text('packaging'),
  priceCents: integer('price_cents'),
  observedAt: timestamp('observed_at').notNull().defaultNow(),
});
