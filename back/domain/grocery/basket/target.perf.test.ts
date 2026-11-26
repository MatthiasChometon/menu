import { describe, expect, it } from 'vitest';
import { measureMedian } from '../../../infrastructure/testing/time-budget';
import { BasketTargetService } from './target.service';
import type { FoodNeed, KnownProduct } from './type';

const foodIds = Array.from({ length: 60 }, (_, index): string => `food${String(index)}`);
const needs: FoodNeed[] = foodIds.map((foodId): FoodNeed => ({ foodId, grams: 960 }));
const products = new Map<string, KnownProduct>(
  foodIds.map((foodId): [string, KnownProduct] => [
    foodId,
    { ean: `356007${foodId}`, name: foodId, size: 500 },
  ]),
);

// A basket is built while the person waits for the run to be queued: a thousand of them, sixty
// lines each, must fit in the instantaneous budget (100 ms).
describe('turning needs into basket lines', () => {
  it('stays instantaneous at a thousand baskets', { retry: 1 }, async () => {
    const service = new BasketTargetService();

    const { median } = await measureMedian(
      () => Promise.resolve(''),
      () => {
        for (let basket = 0; basket < 1000; basket += 1) {
          service.linesFor(needs, new Map<string, number>(), products);
        }

        return Promise.resolve();
      },
    );

    expect(median).toBeLessThanOrEqual(100);
  });
});
