// One basket per week, kept for the life of the app: the week can change under
// the caller when planning ahead, so the storage is resolved on every read
// rather than bound once.
const baskets = new Map<string, Ref<string[]>>();

const basketFor = (weekOf: string): Ref<string[]> => {
  const existing = baskets.get(weekOf);
  if (existing !== undefined) return existing;

  // Keyed by week so a new menu starts with an empty basket without the old
  // ticks bleeding in.
  const created = useLocalStorage<string[]>(`shopping:${weekOf}`, []);
  baskets.set(weekOf, created);
  return created;
};

export const useShoppingCart = (
  week: MaybeRefOrGetter<string>,
): {
  pickedIds: ComputedRef<string[]>;
  isPicked: (foodId: string) => boolean;
  toggle: (foodId: string) => void;
  clear: () => void;
} => {
  const pickedIds = computed((): string[] => basketFor(toValue(week)).value);

  return {
    pickedIds,
    isPicked: (foodId: string): boolean => pickedIds.value.includes(foodId),
    toggle: (foodId: string): void => {
      const basket = basketFor(toValue(week));
      basket.value = basket.value.includes(foodId)
        ? basket.value.filter((id): boolean => id !== foodId)
        : [...basket.value, foodId];
    },
    clear: (): void => {
      basketFor(toValue(week)).value = [];
    },
  };
};
