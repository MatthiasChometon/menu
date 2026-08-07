import { describe, expect, it } from 'vitest';

const TARGETS: Macros = { kcal: 3150, protein: 165, fat: 80, carbs: 445, fiber: 56 };

// A day's worth of real food, taken from the menu rather than invented, so the
// solver is exercised against the ratios it will actually meet.
const dayQuantities = (): FoodQuantity[] => {
  const { latestMenu } = useMenu();
  const day = latestMenu?.days[0];
  if (day === undefined) throw new Error('no day to solve');

  return day.meals.flatMap((meal): FoodQuantity[] => meal.quantities);
};

const within = (actual: number, target: number, percent: number): boolean =>
  Math.abs(actual - target) / target <= percent / 100;

describe('useMacroSolver', () => {
  it('files each food under the macro that carries its energy', () => {
    const { groupOf } = useMacroSolver();
    const { foodOf } = useFoods();

    const chicken = foodOf('chickenBreast');
    const oil = foodOf('oliveOil');
    const rice = foodOf('brownRice');
    if (chicken === undefined || oil === undefined || rice === undefined) {
      throw new Error('missing reference foods');
    }

    expect(groupOf(chicken)).toBe('protein');
    expect(groupOf(oil)).toBe('fat');
    expect(groupOf(rice)).toBe('carbs');
  });

  it('lands the three macros on their targets', () => {
    const { solve } = useMacroSolver();

    const { macros } = solve(dayQuantities(), TARGETS);

    expect(within(macros.protein, TARGETS.protein, 2)).toBe(true);
    expect(within(macros.fat, TARGETS.fat, 2)).toBe(true);
    expect(within(macros.carbs, TARGETS.carbs, 2)).toBe(true);
  });

  it('brings the calories along, since they follow from the macros', () => {
    const { solve } = useMacroSolver();

    const { macros } = solve(dayQuantities(), TARGETS);

    expect(within(macros.kcal, TARGETS.kcal, 2)).toBe(true);
  });

  it('leaves a day it has already solved alone', () => {
    const { solve } = useMacroSolver();

    // Idempotence: solving the result again, for what it achieved, must be a
    // no-op. Anything else means the answer depends on how often it is asked.
    const first = solve(dayQuantities(), TARGETS);
    const { scales } = solve(first.quantities, first.macros);

    for (const scale of Object.values(scales)) {
      expect(scale).toBeGreaterThan(0.99);
      expect(scale).toBeLessThan(1.01);
    }
  });

  it('halves the day when the targets are halved', () => {
    const { solve } = useMacroSolver();
    const half: Macros = {
      kcal: TARGETS.kcal / 2,
      protein: TARGETS.protein / 2,
      fat: TARGETS.fat / 2,
      carbs: TARGETS.carbs / 2,
      fiber: TARGETS.fiber / 2,
    };

    const { macros } = solve(dayQuantities(), half);

    expect(within(macros.protein, half.protein, 2)).toBe(true);
    expect(within(macros.kcal, half.kcal, 2)).toBe(true);
  });

  it('says so rather than serving an impossible portion', () => {
    const { solve } = useMacroSolver();
    // Ten times the food a day asks for cannot be reached by scaling alone.
    const absurd: Macros = {
      kcal: 31_500,
      protein: 1650,
      fat: 800,
      carbs: 4450,
      fiber: 560,
    };

    const { clamped } = solve(dayQuantities(), absurd);

    expect(clamped).toBe(true);
  });

  it('never hands back a negative or absent quantity', () => {
    const { solve } = useMacroSolver();

    const { quantities } = solve(dayQuantities(), TARGETS);

    expect(quantities.length).toBe(dayQuantities().length);
    for (const { grams } of quantities) expect(grams).toBeGreaterThan(0);
  });

  it('copes with a day that has no fat source to scale', () => {
    const { solve } = useMacroSolver();
    const { foodOf } = useFoods();
    const rice = foodOf('brownRice');
    if (rice === undefined) throw new Error('missing rice');

    // Singular system: there is no lever for fat. It must not throw or produce
    // nonsense, it must report that it could not comply.
    const { quantities, clamped } = solve([{ food: rice, grams: 200 }], TARGETS);

    expect(quantities).toHaveLength(1);
    expect(clamped).toBe(true);
  });
});
