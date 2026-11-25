import { describe, expect, it, vi } from 'vitest';

// Each store is held for the life of the app, so a fresh module stands in for
// opening the app again with whatever an earlier visit left in the browser.
const reopened = async (key: string, stored: unknown): Promise<void> => {
  localStorage.setItem(key, JSON.stringify(stored));
  vi.resetModules();
};

describe('what an earlier visit left in the browser', () => {
  it('keeps the pantry when it is a list of ids', async () => {
    await reopened('shopping:pantry', ['rice']);
    const { usePantry: fresh } = await import('./usePantry');

    expect(fresh().pantryIds.value).toEqual(['rice']);
  });

  it('empties the pantry when it holds something else', async () => {
    await reopened('shopping:pantry', ['rice', 4]);
    const { usePantry: fresh } = await import('./usePantry');

    expect(fresh().pantryIds.value).toEqual([]);
  });

  it('starts an empty basket when the ticks are not ids', async () => {
    await reopened('shopping:2026-09-07', { rice: true });
    const { useShoppingCart: fresh } = await import('./useShoppingCart');

    expect(fresh('2026-09-07').pickedIds.value).toEqual([]);
  });

  it.each([['lots'], [-4], [0]])('forgets a paid amount of %j', async (stored) => {
    await reopened('shoppingSpend:2026-09-07', stored);
    const { useShoppingSpend: fresh } = await import('./useShoppingSpend');

    expect(fresh('2026-09-07').actualEuros.value).toBeUndefined();
  });

  it('keeps an amount that was really paid', async () => {
    await reopened('shoppingSpend:2026-09-07', 87.5);
    const { useShoppingSpend: fresh } = await import('./useShoppingSpend');

    expect(fresh('2026-09-07').actualEuros.value).toBe(87.5);
  });
});
