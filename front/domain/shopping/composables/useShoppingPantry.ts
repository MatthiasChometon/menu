// Splits a shopping list in two along what usePantry knows: the active groups
// and seasonings a reader still has to buy, priced for what is left rather
// than for the whole menu, and the flat shelf of entries that stepped aside.
export const useShoppingPantry = (
  groups: MaybeRefOrGetter<ShoppingGroup[]>,
  seasonings: MaybeRefOrGetter<Seasoning[]>,
): {
  isInPantry: (id: string) => boolean;
  toggle: (id: string) => void;
  activeGroups: ComputedRef<ShoppingGroup[]>;
  activeSeasonings: ComputedRef<Seasoning[]>;
  pantryEntries: ComputedRef<PantryEntry[]>;
} => {
  const { isInPantry, toggle } = usePantry();

  const activeGroups = computed((): ShoppingGroup[] =>
    toValue(groups)
      .map((group): ShoppingGroup => {
        const lines = group.lines.filter((line): boolean => !isInPantry(line.food.id));
        return {
          ...group,
          lines,
          price: lines.reduce((total, line): number => total + line.price, 0),
        };
      })
      .filter((group): boolean => group.lines.length > 0),
  );

  const activeSeasonings = computed((): Seasoning[] =>
    toValue(seasonings).filter((seasoning): boolean => !isInPantry(seasoning.id)),
  );

  const pantryEntries = computed((): PantryEntry[] => [
    ...toValue(groups).flatMap((group): PantryEntry[] =>
      group.lines
        .filter((line): boolean => isInPantry(line.food.id))
        .map((line): PantryEntry => ({
          id: line.food.id,
          name: line.food.name,
          icon: line.food.icon,
        })),
    ),
    ...toValue(seasonings)
      .filter((seasoning): boolean => isInPantry(seasoning.id))
      .map((seasoning): PantryEntry => ({
        id: seasoning.id,
        name: seasoning.name,
        icon: seasoning.icon,
      })),
  ]);

  return { isInPantry, toggle, activeGroups, activeSeasonings, pantryEntries };
};
