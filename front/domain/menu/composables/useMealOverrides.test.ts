import { beforeEach, describe, expect, it } from 'vitest';

const weekOf = (): string => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return latestMenu.weekOf;
};

beforeEach((): void => {
  useMealOverrides(weekOf()).reset();
});

describe('useMealOverrides', () => {
  it('starts with no override', () => {
    const { kindOf } = useMealOverrides(weekOf());

    expect(kindOf('monday', 'lunch')).toBeUndefined();
  });

  it('marks a meal as eaten out', () => {
    const { setEatingOut, kindOf } = useMealOverrides(weekOf());

    setEatingOut('monday', 'dinner');

    expect(kindOf('monday', 'dinner')).toBe('eatingOut');
  });

  it('marks a meal as a cheat meal', () => {
    const { setCheatMeal, kindOf } = useMealOverrides(weekOf());

    setCheatMeal('tuesday', 'lunch');

    expect(kindOf('tuesday', 'lunch')).toBe('cheatMeal');
  });

  it('clears an override', () => {
    const { setEatingOut, clearOverride, kindOf } = useMealOverrides(weekOf());

    setEatingOut('monday', 'dinner');
    clearOverride('monday', 'dinner');

    expect(kindOf('monday', 'dinner')).toBeUndefined();
  });

  it('is not a day off until every one of its slots is a cheat meal', () => {
    const { setCheatMeal, isDayOff } = useMealOverrides(weekOf());
    const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

    setCheatMeal('wednesday', 'breakfast');

    expect(isDayOff('wednesday', slots)).toBe(false);
  });

  it('marks a whole day off in one call', () => {
    const { setDayOff, isDayOff, kindOf } = useMealOverrides(weekOf());
    const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

    setDayOff('wednesday', slots);

    expect(isDayOff('wednesday', slots)).toBe(true);
    expect(kindOf('wednesday', 'lunch')).toBe('cheatMeal');
  });

  it('clears a whole day off in one call', () => {
    const { setDayOff, clearDayOff, isDayOff, kindOf } = useMealOverrides(weekOf());
    const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

    setDayOff('wednesday', slots);
    clearDayOff('wednesday', slots);

    expect(isDayOff('wednesday', slots)).toBe(false);
    for (const slot of slots) expect(kindOf('wednesday', slot)).toBeUndefined();
  });

  it('keeps overrides scoped to their own week', () => {
    useMealOverrides('2091-01-07').reset();
    const { setEatingOut } = useMealOverrides('2091-01-07');

    setEatingOut('monday', 'dinner');

    const { kindOf } = useMealOverrides(weekOf());
    expect(kindOf('monday', 'dinner')).toBeUndefined();
  });
});
