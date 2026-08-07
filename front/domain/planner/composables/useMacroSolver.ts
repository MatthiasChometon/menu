// Adjusting a day to its targets is a three-lever problem, not a single ratio.
// Every food is dominated by one macro — chicken is protein, olive oil is fat,
// rice is carbohydrate — so scaling the three groups independently lets protein,
// fat and carbohydrate each land where they should. With three unknowns and
// three equations that is a linear system, solved exactly rather than nudged.
//
// Calories are not a fourth equation: they follow from 4/9/4, which is how
// check_menu.py computes them too. Fibre is a consequence of the foods chosen,
// never a lever — it is reported, not solved.

export type MacroGroup = 'protein' | 'fat' | 'carbs';

export type SolvedQuantity = FoodQuantity & { group: MacroGroup };

export type SolverOutcome = {
  quantities: SolvedQuantity[];
  /** What the day now adds up to. */
  macros: Macros;
  /** The three multipliers applied, for explaining the result. */
  scales: Record<MacroGroup, number>;
  /** True when a lever had to be clamped, so the targets were not fully met. */
  clamped: boolean;
};

// A portion has to stay something a human eats. Beyond these the answer is not
// "weigh more rice", it is "the dishes chosen cannot make this day".
const MIN_SCALE = 0.35;
const MAX_SCALE = 2.5;

const KCAL_PER_GRAM: Record<MacroGroup, number> = { protein: 4, fat: 9, carbs: 4 };

export const useMacroSolver = (): {
  groupOf: (food: Food) => MacroGroup;
  solve: (quantities: FoodQuantity[], targets: Macros) => SolverOutcome;
} => {
  const { macrosOfQuantities } = useNutrition();

  // Whichever macro carries most of the food's energy owns it. Ties go to
  // protein, then fat: the levers matter in that order for a body being fed.
  const groupOf = (food: Food): MacroGroup => {
    const energy: Record<MacroGroup, number> = {
      protein: food.protein * KCAL_PER_GRAM.protein,
      fat: food.fat * KCAL_PER_GRAM.fat,
      carbs: food.carbs * KCAL_PER_GRAM.carbs,
    };

    if (energy.protein >= energy.fat && energy.protein >= energy.carbs) return 'protein';
    return energy.fat >= energy.carbs ? 'fat' : 'carbs';
  };

  // Cramer's rule on a 3×3: small enough that a general solver would only hide
  // what is happening.
  const solveLinear = (matrix: number[][], right: number[]): number[] | undefined => {
    const det = (m: number[][]): number =>
      (m[0]?.[0] ?? 0) *
        ((m[1]?.[1] ?? 0) * (m[2]?.[2] ?? 0) - (m[1]?.[2] ?? 0) * (m[2]?.[1] ?? 0)) -
      (m[0]?.[1] ?? 0) *
        ((m[1]?.[0] ?? 0) * (m[2]?.[2] ?? 0) - (m[1]?.[2] ?? 0) * (m[2]?.[0] ?? 0)) +
      (m[0]?.[2] ?? 0) *
        ((m[1]?.[0] ?? 0) * (m[2]?.[1] ?? 0) - (m[1]?.[1] ?? 0) * (m[2]?.[0] ?? 0));

    const base = det(matrix);
    // Singular means a group contributes nothing distinguishable — typically a
    // day with no fat source at all. There is nothing to solve for it.
    if (Math.abs(base) < 1e-9) return undefined;

    return [0, 1, 2].map((column): number => {
      const replaced = matrix.map((row, index): number[] =>
        row.map((value, position): number => (position === column ? (right[index] ?? 0) : value)),
      );
      return det(replaced) / base;
    });
  };

  const clamp = (value: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const round = (grams: number): number =>
    grams < 5 ? Math.round(grams * 10) / 10 : Math.round(grams);

  return {
    groupOf,
    solve: (quantities: FoodQuantity[], targets: Macros): SolverOutcome => {
      const grouped = quantities.map((quantity): SolvedQuantity => ({
        ...quantity,
        group: groupOf(quantity.food),
      }));

      // Each row is a macro, each column a group: how much of that macro one
      // unit of that group's current grammes brings.
      const contribution = (group: MacroGroup, macro: 'protein' | 'fat' | 'carbs'): number =>
        grouped
          .filter((quantity): boolean => quantity.group === group)
          .reduce((total, { food, grams }): number => total + (food[macro] * grams) / 100, 0);

      const groups: MacroGroup[] = ['protein', 'fat', 'carbs'];
      const matrix = (['protein', 'fat', 'carbs'] as const).map((macro): number[] =>
        groups.map((group): number => contribution(group, macro)),
      );
      const right = [targets.protein, targets.fat, targets.carbs];

      const solved = solveLinear(matrix, right);
      const raw: Record<MacroGroup, number> =
        solved === undefined
          ? { protein: 1, fat: 1, carbs: 1 }
          : { protein: solved[0] ?? 1, fat: solved[1] ?? 1, carbs: solved[2] ?? 1 };

      const scales: Record<MacroGroup, number> = {
        protein: clamp(raw.protein),
        fat: clamp(raw.fat),
        carbs: clamp(raw.carbs),
      };

      const clamped =
        solved === undefined ||
        groups.some((group): boolean => Math.abs(scales[group] - raw[group]) > 1e-6);

      const scaled = grouped.map((quantity): SolvedQuantity => ({
        ...quantity,
        grams: round(quantity.grams * scales[quantity.group]),
      }));

      return { quantities: scaled, macros: macrosOfQuantities(scaled), scales, clamped };
    },
  };
};
