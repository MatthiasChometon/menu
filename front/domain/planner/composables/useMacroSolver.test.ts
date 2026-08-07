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
  it('files vegetables apart, so fibre has a lever of its own', () => {
    const { groupOf } = useMacroSolver();
    const { foodOf } = useFoods();

    const courgette = foodOf('zucchini');
    const broccoli = foodOf('broccoli');
    const banana = foodOf('banana');
    const rice = foodOf('brownRice');
    if ([courgette, broccoli, banana, rice].some((food): boolean => food === undefined)) {
      throw new Error('missing reference foods');
    }

    expect(groupOf(courgette!)).toBe('vegetable');
    expect(groupOf(broccoli!)).toBe('vegetable');
    // Fruit stays out: tripling a banana is not the same proposition as
    // tripling a courgette, and it is the aisle's cheap fibre we are after.
    expect(groupOf(banana!)).not.toBe('vegetable');
    // The whole point: vegetables no longer ride along with the rice.
    expect(groupOf(rice!)).toBe('carbs');
  });

  it('lands fibre on target too, by asking for more vegetables', () => {
    const { solve } = useMacroSolver();

    const { macros } = solve(dayQuantities(), TARGETS);

    // Fibre used to be whatever the dishes happened to give; it is now steered.
    expect(within(macros.fiber, TARGETS.fiber, 5)).toBe(true);
  });

  it('reaches a fibre target the dishes alone would miss', () => {
    const { solve } = useMacroSolver();

    const hungryForFibre: Macros = { ...TARGETS, fiber: TARGETS.fiber * 1.4 };
    const before = solve(dayQuantities(), TARGETS);
    const after = solve(dayQuantities(), hungryForFibre);

    // More fibre asked for, more vegetables served — and the macros still land.
    expect(after.macros.fiber).toBeGreaterThan(before.macros.fiber);
    expect(after.scales.vegetable).toBeGreaterThan(before.scales.vegetable);
    expect(within(after.macros.protein, TARGETS.protein, 2)).toBe(true);
    expect(within(after.macros.carbs, TARGETS.carbs, 2)).toBe(true);
  });

  it('still solves the macros on a day that has no vegetable at all', () => {
    const { solve } = useMacroSolver();
    const { foodOf } = useFoods();

    // Portions a day could plausibly start from: too little to begin with and
    // the levers saturate, which would be testing the clamps instead.
    const quantities = Object.entries({
      oats: 250,
      whey: 90,
      peanutButter: 60,
      semiSkimmedMilk: 600,
    })
      .map(([id, grams]): FoodQuantity | undefined => {
        const food = foodOf(id);
        return food === undefined ? undefined : { food, grams };
      })
      .filter((quantity): quantity is FoodQuantity => quantity !== undefined);

    // A mistyped id would quietly leave a lever with nothing in it, and the
    // test would then be measuring the fallback rather than what it claims.
    expect(quantities).toHaveLength(4);

    const { macros } = solve(quantities, TARGETS);

    // No lever for fibre here, but the three that exist must still land.
    expect(within(macros.protein, TARGETS.protein, 5)).toBe(true);
    expect(within(macros.fat, TARGETS.fat, 5)).toBe(true);
  });

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
