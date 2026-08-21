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
  /** True while it is not yet known how many people this list is buying for. */
  isLoading: ComputedRef<boolean>;
  /** Shown as written in the menu, because nobody could be read to weigh for. */
  isUnscaled: ComputedRef<boolean>;
  linesFor: (menu: Menu) => ShoppingLine[];
} => {
  const { eaters: live, isLoading } = useHouseholdQuantities();
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

  // How long a shop with no signal is asked to look at grey boxes. The request
  // can hang far longer than it takes to give up on it — a phone at the back of
  // a supermarket often gets no answer at all — and a list nobody can read is
  // worse than one weighed for the menu rather than for the household.
  const PATIENCE_MS = 2500;

  const waitedLongEnough = ref(false);
  onMounted((): void => {
    const timer = setTimeout((): void => {
      waitedLongEnough.value = true;
    }, PATIENCE_MS);
    onScopeDispose((): void => clearTimeout(timer));
  });

  // A copy on the device answers instantly, so the wait only ever happens on
  // a first visit — which is exactly when guessing would be worst.
  return {
    eaters,
    isLoading: computed(
      (): boolean => isLoading.value && stored.value.length === 0 && !waitedLongEnough.value,
    ),
    /** The household never answered: the list is the menu's own, not this
     *  household's, and saying so is the only honest way to show it. Signed
     *  out is a different case — there the menu's own list is the right one,
     *  and there is nothing to apologise for. */
    isUnscaled: computed(
      (): boolean => isLoading.value && waitedLongEnough.value && stored.value.length === 0,
    ),
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
