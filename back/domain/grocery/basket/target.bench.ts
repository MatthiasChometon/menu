import { bench, describe } from 'vitest';
import { BasketTargetService } from './target.service';
import type { FoodNeed, KnownProduct } from './type';

const service = new BasketTargetService();

const foodIds = Array.from({ length: 60 }, (_, index): string => `food${String(index)}`);
const needs: FoodNeed[] = foodIds.map((foodId): FoodNeed => ({ foodId, grams: 960 }));
const products = new Map<string, KnownProduct>(
  foodIds.map((foodId): [string, KnownProduct] => [
    foodId,
    { ean: `356007${foodId}`, name: foodId, size: 500 },
  ]),
);
const pantry = new Map<string, number>(
  foodIds.slice(0, 20).map((foodId): [string, number] => [foodId, 200]),
);

// Turns a week of menus into the basket the browser fills: one pass over every need.
describe('basket lines', () => {
  bench('linesFor sixty needs', () => {
    service.linesFor(needs, pantry, products);
  });
});
