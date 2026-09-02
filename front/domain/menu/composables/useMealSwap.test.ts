import { beforeEach, describe, expect, it } from 'vitest';

const weekOf = (): string => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return latestMenu.weekOf;
};

beforeEach((): void => {
  useMealSwap(weekOf()).reset();
});

describe('useMealSwap', () => {
  it('points a slot at itself by default', () => {
    const { sourceOf, isSwapped } = useMealSwap(weekOf());

    expect(sourceOf('monday', 'lunch')).toEqual({ day: 'monday', slot: 'lunch' });
    expect(isSwapped('monday', 'lunch')).toBe(false);
  });

  it('trades what two slots point to', () => {
    const { swapMeal, sourceOf, isSwapped } = useMealSwap(weekOf());

    swapMeal('monday', 'dinner', 'tuesday', 'dinner');

    expect(sourceOf('monday', 'dinner')).toEqual({ day: 'tuesday', slot: 'dinner' });
    expect(sourceOf('tuesday', 'dinner')).toEqual({ day: 'monday', slot: 'dinner' });
    expect(isSwapped('monday', 'dinner')).toBe(true);
    expect(isSwapped('tuesday', 'dinner')).toBe(true);
  });

  it('undoes a swap by swapping the same pair again', () => {
    const { swapMeal, sourceOf, isSwapped } = useMealSwap(weekOf());

    swapMeal('monday', 'dinner', 'tuesday', 'dinner');
    swapMeal('monday', 'dinner', 'tuesday', 'dinner');

    expect(sourceOf('monday', 'dinner')).toEqual({ day: 'monday', slot: 'dinner' });
    expect(isSwapped('monday', 'dinner')).toBe(false);
  });

  it('swaps every shared slot of two days at once', () => {
    const { swapDay, sourceOf } = useMealSwap(weekOf());
    const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

    swapDay('monday', 'tuesday', slots);

    for (const slot of slots) {
      expect(sourceOf('monday', slot)).toEqual({ day: 'tuesday', slot });
      expect(sourceOf('tuesday', slot)).toEqual({ day: 'monday', slot });
    }
  });

  it('leaves an untouched slot pointing at itself', () => {
    const { swapMeal, sourceOf } = useMealSwap(weekOf());

    swapMeal('monday', 'dinner', 'tuesday', 'dinner');

    expect(sourceOf('monday', 'breakfast')).toEqual({ day: 'monday', slot: 'breakfast' });
  });
});
