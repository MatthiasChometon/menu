// Adjusting a day to its targets is a three-lever problem with a fourth lever
// alongside it. Every food is dominated by one macro — chicken is protein,
// olive oil is fat, rice is carbohydrate — so scaling those groups
// independently lets protein, fat and carbohydrate each land where they
// should, exactly rather than nudged.
//
// Vegetables are the fourth, and they answer for fibre. They carry it at almost
// no energy cost, so asking for more of them is what turns "swap this dish for
// another" into "put more courgette in the one you chose". They move first and
// the three macro levers land around them, rather than all four competing:
// measured on a reference day, the grains and pulses bring 49 g of the fibre
// and the vegetables 4.3 g, so a fibre equation weighed equally with the others
// would trade eighty grammes of carbohydrate for a few grammes of fibre it
// could not reach anyway.
//
// Calories are not a fifth equation: they follow from 4/9/4, which is how
// check_menu.py computes them too.

export type MacroGroup = 'protein' | 'fat' | 'carbs' | 'vegetable';

export type SolvedQuantity = FoodQuantity & { group: MacroGroup };

export type SolverOutcome = {
  quantities: SolvedQuantity[];
  /** What the day now adds up to. */
  macros: Macros;
  /** The multipliers applied, for explaining the result. */
  scales: Record<MacroGroup, number>;
  /** True when a lever had to be clamped, so the targets were not fully met. */
  clamped: boolean;
};

// A portion has to stay something a human eats. Beyond these the answer is not
// "weigh more rice", it is "the dishes chosen cannot make this day".
const MIN_SCALE = 0.35;
const MAX_SCALE = 2.5;

// Vegetables stretch further than the rest, in both directions: a plate with
// three times the greens is an ordinary plate, where three times the rice is
// not. This is what gives fibre enough room to be met.
const MIN_VEGETABLE_SCALE = 0.4;
const MAX_VEGETABLE_SCALE = 3.5;

const KCAL_PER_GRAM = { protein: 4, fat: 9, carbs: 4 } as const;

// What separates the fibre lever from everything else. The aisle alone would
// take the fruit with it, and a 250 g banana is not the same proposition as
// 250 g of courgette; in this catalogue the vegetables stop at 45 kcal and the
// fruit starts at 47.
const VEGETABLE_AISLE = 'produce';
const VEGETABLE_MAX_KCAL = 45;

type Nutrient = 'protein' | 'fat' | 'carbs' | 'fiber';

export const useMacroSolver = (): {
  groupOf: (food: Food) => MacroGroup;
  solve: (quantities: FoodQuantity[], targets: Macros) => SolverOutcome;
} => {
  const { macrosOfQuantities } = useNutrition();

  const isVegetable = (food: Food): boolean =>
    food.aisle === VEGETABLE_AISLE && food.kcal <= VEGETABLE_MAX_KCAL;

  // Vegetables first: they would otherwise file under carbohydrate and be
  // scaled with the rice, which is exactly the coupling this lever exists to
  // break. Otherwise whichever macro carries most of the food's energy owns it,
  // ties going to protein then fat — the levers matter in that order for a body
  // being fed.
  const groupOf = (food: Food): MacroGroup => {
    if (isVegetable(food)) return 'vegetable';

    const energy = {
      protein: food.protein * KCAL_PER_GRAM.protein,
      fat: food.fat * KCAL_PER_GRAM.fat,
      carbs: food.carbs * KCAL_PER_GRAM.carbs,
    };

    if (energy.protein >= energy.fat && energy.protein >= energy.carbs) return 'protein';
    return energy.fat >= energy.carbs ? 'fat' : 'carbs';
  };

  // Gaussian elimination with partial pivoting. Cramer's rule was readable at
  // 3×3 and is not at 4×4, and the pivoting is what keeps a day whose levers
  // are nearly proportional from dividing by very nearly nothing.
  const solveLinear = (matrix: number[][], right: number[]): number[] | undefined => {
    const size = right.length;
    const rows = matrix.map((row, index): number[] => [...row, right[index] ?? 0]);

    for (let column = 0; column < size; column += 1) {
      let pivot = column;
      for (let row = column + 1; row < size; row += 1) {
        if (Math.abs(rows[row]?.[column] ?? 0) > Math.abs(rows[pivot]?.[column] ?? 0)) pivot = row;
      }

      const pivotRow = rows[pivot];
      const currentRow = rows[column];
      if (pivotRow === undefined || currentRow === undefined) return undefined;
      rows[column] = pivotRow;
      rows[pivot] = currentRow;

      const head = rows[column]?.[column] ?? 0;
      // Singular: a lever contributes nothing the others do not already, which
      // is a day with no fat source, or no vegetable at all.
      if (Math.abs(head) < 1e-9) return undefined;

      for (let row = column + 1; row < size; row += 1) {
        const factor = (rows[row]?.[column] ?? 0) / head;
        if (factor === 0) continue;
        for (let position = column; position <= size; position += 1) {
          const target = rows[row];
          if (target === undefined) continue;
          target[position] = (target[position] ?? 0) - factor * (rows[column]?.[position] ?? 0);
        }
      }
    }

    const answer = Array.from({ length: size }, (): number => 0);
    for (let row = size - 1; row >= 0; row -= 1) {
      let sum = rows[row]?.[size] ?? 0;
      for (let column = row + 1; column < size; column += 1) {
        sum -= (rows[row]?.[column] ?? 0) * (answer[column] ?? 0);
      }
      answer[row] = sum / (rows[row]?.[row] ?? 1);
    }

    return answer.every((value): boolean => Number.isFinite(value)) ? answer : undefined;
  };

  const clampFor = (group: MacroGroup, value: number): number =>
    group === 'vegetable'
      ? Math.min(MAX_VEGETABLE_SCALE, Math.max(MIN_VEGETABLE_SCALE, value))
      : Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const round = (grams: number): number =>
    grams < 5 ? Math.round(grams * 10) / 10 : Math.round(grams);

  return {
    groupOf,
    solve: (quantities: FoodQuantity[], targets: Macros): SolverOutcome => {
      const grouped = quantities.map((quantity): SolvedQuantity => ({
        ...quantity,
        group: groupOf(quantity.food),
      }));

      // Each row is a macro, each column a lever: how much of that macro one
      // unit of that lever's current grammes brings.
      const contribution = (group: MacroGroup, macro: Nutrient): number =>
        grouped
          .filter((quantity): boolean => quantity.group === group)
          .reduce((total, { food, grams }): number => total + (food[macro] * grams) / 100, 0);

      const build = (
        levers: MacroGroup[],
        macros: readonly Nutrient[],
      ): { matrix: number[][]; right: number[] } => ({
        matrix: macros.map((macro): number[] =>
          levers.map((group): number => contribution(group, macro)),
        ),
        right: macros.map((macro): number => targets[macro]),
      });

      const macroLevers: MacroGroup[] = ['protein', 'fat', 'carbs'];
      const macroEquations = ['protein', 'fat', 'carbs'] as const;
      const base = build(macroLevers, macroEquations);

      // The three macros are solved around whatever the vegetables were set to,
      // never against them. Their grammes leave the right-hand side before the
      // system is solved, so the answer lands exactly whatever fibre asked for.
      const solveMacros = (
        vegetableScale: number,
      ): { raw: Record<MacroGroup, number>; solved: boolean } => {
        const right = macroEquations.map(
          (macro, index): number =>
            (base.right[index] ?? 0) - contribution('vegetable', macro) * vegetableScale,
        );
        const answer = solveLinear(base.matrix, right);

        return {
          raw: {
            protein: answer?.[0] ?? 1,
            fat: answer?.[1] ?? 1,
            carbs: answer?.[2] ?? 1,
            vegetable: vegetableScale,
          },
          solved: answer !== undefined,
        };
      };

      // Vegetables move for fibre, and only as far as fibre needs. Deliberately
      // not a fourth equation weighed against the others: a day's fibre comes
      // overwhelmingly from its grains and pulses — 49 g of a reference day's
      // 56, against 4.3 g from the vegetables — so letting it compete bought a
      // few grams of fibre by throwing carbohydrate off by eighty. Here they
      // close what gap they can and the macros still land exactly.
      const vegetableFibre = contribution('vegetable', 'fiber');

      let vegetableScale = 1;
      let attempt = solveMacros(vegetableScale);

      if (vegetableFibre > 0) {
        // Each pass re-reads how much fibre the macro levers ended up serving,
        // which moves as they settle. Three is enough: the coupling is weak in
        // this direction, so it converges almost at once.
        for (let pass = 0; pass < 3; pass += 1) {
          const fromMacros = macroLevers.reduce(
            (total, group): number =>
              total + contribution(group, 'fiber') * clampFor(group, attempt.raw[group]),
            0,
          );
          vegetableScale = clampFor('vegetable', (targets.fiber - fromMacros) / vegetableFibre);
          attempt = solveMacros(vegetableScale);
        }
      }

      const raw = attempt.raw;
      const scales: Record<MacroGroup, number> = {
        protein: clampFor('protein', raw.protein),
        fat: clampFor('fat', raw.fat),
        carbs: clampFor('carbs', raw.carbs),
        vegetable: clampFor('vegetable', raw.vegetable),
      };

      // A lever nobody is using cannot have been clamped: a day with no fat
      // source must not be reported impossible on that account. Vegetables are
      // left out of this on purpose — running out of them means fibre fell
      // short, which the day's verdicts already say, not that the day cannot be
      // made.
      const inUse = (group: MacroGroup): boolean =>
        grouped.some((quantity): boolean => quantity.group === group);

      const clamped =
        !attempt.solved ||
        macroLevers.some(
          (group): boolean => inUse(group) && Math.abs(scales[group] - raw[group]) > 1e-6,
        );

      const scaled = grouped.map((quantity): SolvedQuantity => ({
        ...quantity,
        grams: round(quantity.grams * scales[quantity.group]),
      }));

      return { quantities: scaled, macros: macrosOfQuantities(scaled), scales, clamped };
    },
  };
};
