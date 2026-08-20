import type { Targets } from './useProfile';

/** Somebody the dish is being weighed for. */
export type Eater = { id: string; name: string; targets: Targets };

/** One ingredient: what goes in the pan, and what each person gets out of it. */
export type SharedQuantity = {
  food: FoodQuantity['food'];
  total: number;
  perEater: { eater: Eater; grams: number }[];
};

// The sum of the ROUNDED portions, not the rounded sum. The cook weighs this
// number and then serves the portions listed under it: rounding the total on its
// own would leave the parts not adding up to what is in the pan, and somebody
// short by a gramme at every meal.
export const totalOf = (perEater: SharedQuantity['perEater']): number => {
  const sum = perEater.reduce((running, { grams }): number => running + grams, 0);

  return sum < 5 ? Math.round(sum * 10) / 10 : Math.round(sum);
};

// Plain function rather than part of the composable: this is the arithmetic,
// and it can be checked without a browser, a session or a profile request.
export const sharePortions = (
  quantities: FoodQuantity[],
  menuTargets: Targets | undefined,
  eaters: Eater[],
): SharedQuantity[] => {
  const { scaleQuantity } = useScaledQuantities();

  return quantities.map(({ food, grams }): SharedQuantity => {
    // Nobody to weigh for — signed out, or no profile answered yet. The recipe
    // is then shown exactly as written, which is the only honest thing to show.
    if (eaters.length === 0 || menuTargets === undefined) {
      return { food, total: grams, perEater: [] };
    }

    const perEater = eaters.map((eater): SharedQuantity['perEater'][number] => ({
      eater,
      grams: scaleQuantity(
        grams,
        { kcal: food.kcal, protein: food.protein },
        menuTargets,
        eater.targets,
      ),
    }));

    return { food, total: totalOf(perEater), perEater };
  });
};

// The wiring: who is at the table, and the recipe read for them. Kept apart
// from useMyQuantities because the two answer different questions — one says
// what to weigh out to cook, the other what to put on a plate.
export const useHouseholdQuantities = (): {
  eaters: ComputedRef<Eater[]>;
  scale: (quantities: FoodQuantity[], menuTargets: Targets | undefined) => SharedQuantity[];
} => {
  const { profile } = useProfile();
  const { user } = useAuth();

  // One person for now — the account holder. The shape is already the one a
  // household needs, so adding people later changes where this list comes from
  // and nothing else.
  const eaters = computed((): Eater[] =>
    profile.value === undefined
      ? []
      : [{ id: 'me', name: user.value?.name ?? '', targets: profile.value.targets }],
  );

  return {
    eaters,
    scale: (quantities, menuTargets): SharedQuantity[] =>
      sharePortions(quantities, menuTargets, eaters.value),
  };
};
