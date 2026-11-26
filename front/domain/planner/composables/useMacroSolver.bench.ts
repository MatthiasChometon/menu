import { bench, describe } from 'vitest';

// The hot pure function of the front: the macro solver runs in the browser every time a
// day is shown or a dish is swapped, on a phone. Its mean time is compared with the stored
// baseline (bench/baseline.json) by `pnpm bench`, which fails on a slowdown.

const TARGETS: Macros = { kcal: 3150, protein: 165, fat: 80, carbs: 445, fiber: 56 };

const weekQuantities = (): FoodQuantity[][] => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to solve');

  return latestMenu.days.map((day): FoodQuantity[] =>
    day.meals.flatMap((meal): FoodQuantity[] => meal.quantities),
  );
};

describe('useMacroSolver', () => {
  const { solve } = useMacroSolver();
  const days = weekQuantities();
  const [firstDay] = days;
  if (firstDay === undefined) throw new Error('no day to solve');

  bench('solve one day', () => {
    solve(firstDay, TARGETS);
  });

  bench('solve a whole week', () => {
    for (const day of days) solve(day, TARGETS);
  });
});
