import type { Eater } from '../../profile/composables/useHouseholdQuantities';

// The people the week is cooked for, kept on the device. The household is read
// over the network, and this list is needed in a shop with no signal: without a
// copy, the quantities would silently fall back to one person exactly where
// they are read out loud.
const cachedEaters = (): Ref<Eater[]> => useLocalStorage<Eater[]>('shopping:eaters', []);

// What to buy, for everyone who eats it. The recipe page already serves each
// person their share of the pan; the list has to fill the pan in the first
// place, or a household of three shops for one.
export const useShoppingQuantities = (): {
  eaters: ComputedRef<Eater[]>;
  linesFor: (menu: Menu) => ShoppingLine[];
} => {
  const { eaters: live } = useHouseholdQuantities();
  const { scaleQuantity } = useScaledQuantities();
  const stored = cachedEaters();

  // Refreshed whenever the account is reachable, read from the copy otherwise.
  watch(
    live,
    (people): void => {
      if (people.length > 0) stored.value = people;
    },
    { immediate: true },
  );

  const eaters = computed((): Eater[] => (live.value.length > 0 ? live.value : stored.value));

  return {
    eaters,
    linesFor: (menu: Menu): ShoppingLine[] =>
      menu.shoppingList.map((line): ShoppingLine => {
        // Nobody to weigh for: the list stays exactly as the menu wrote it,
        // which is what a signed-out reader should see.
        if (eaters.value.length === 0) return line;

        const grams = eaters.value.reduce(
          (total, eater): number =>
            total +
            scaleQuantity(
              line.grams,
              { kcal: line.food.kcal, protein: line.food.protein },
              menu.targets,
              eater.targets,
            ),
          0,
        );
        const rounded = Math.round(grams);

        return { ...line, grams: rounded, price: (line.food.pricePerKg * rounded) / 1000 };
      }),
  };
};
