import type { Targets } from './useProfile';

// Turns the recipe's own grammes into the ones this visitor should weigh out.
// Signed out, or with no profile yet, the recipe is shown exactly as written.
export const useMyQuantities = (): {
  isPersonalised: ComputedRef<boolean>;
  scale: (quantities: FoodQuantity[], menuTargets: Targets | undefined) => FoodQuantity[];
} => {
  const { profile } = useProfile();
  const { scaleQuantity } = useScaledQuantities();

  const isPersonalised = computed((): boolean => profile.value !== undefined);

  const scale = (quantities: FoodQuantity[], menuTargets: Targets | undefined): FoodQuantity[] => {
    const mine = profile.value?.targets;
    if (mine === undefined || menuTargets === undefined) return quantities;

    return quantities.map(({ food, grams }): FoodQuantity => ({
      food,
      grams: scaleQuantity(grams, { kcal: food.kcal, protein: food.protein }, menuTargets, mine),
    }));
  };

  return { isPersonalised, scale };
};
