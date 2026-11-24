import { groceryBasketLine } from './schema';
import { BasketLine } from './type';

export const basketRowsOf = (
  jobId: string,
  lines: BasketLine[],
): (typeof groceryBasketLine.$inferInsert)[] =>
  lines.map((line): typeof groceryBasketLine.$inferInsert => ({
    jobId,
    foodId: line.foodId,
    label: line.label ?? null,
    grams: line.grams,
    fromPantry: line.fromPantry,
    ean: line.product?.ean ?? null,
    productName: line.product?.name ?? null,
    unitSize: line.product?.size ?? null,
    units: line.units ?? null,
  }));
