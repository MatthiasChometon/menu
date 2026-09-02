export const useLibraryFilters = (
  entries: MaybeRefOrGetter<LibraryEntry[]>,
): {
  query: Ref<string>;
  macroFilter: Ref<MacroFilter>;
  timeFilter: Ref<TimeFilter>;
  seasonOnly: Ref<boolean>;
  filteredEntries: ComputedRef<LibraryEntry[]>;
  reset: () => void;
} => {
  const { nameOf } = useFoodFormat();
  const { foodOf } = useFoods();

  const query = ref('');
  const macroFilter = ref<MacroFilter>('all');
  const timeFilter = ref<TimeFilter>('all');
  const seasonOnly = ref(false);

  const matchesIngredient = (id: string, needle: string): boolean => {
    const food = foodOf(id);
    return food !== undefined && nameOf(food).toLocaleLowerCase().includes(needle);
  };

  // A dish or an ingredient: "poulet" finds the chicken chili by name, and
  // "brocoli" finds it because it is in the pan, even when it is not the title.
  const matchesQuery = (entry: LibraryEntry): boolean => {
    const needle = query.value.trim().toLocaleLowerCase();
    if (needle === '') return true;

    return (
      nameOf(entry.recipe).toLocaleLowerCase().includes(needle) ||
      entry.ingredientIds.some((id): boolean => matchesIngredient(id, needle))
    );
  };

  const matchesMacro = (entry: LibraryEntry): boolean =>
    macroFilter.value === 'all' || entry.dominantMacro === macroFilter.value;

  const matchesTime = (entry: LibraryEntry): boolean =>
    timeFilter.value === 'all' || entry.prepBucket === timeFilter.value;

  const matchesSeason = (entry: LibraryEntry): boolean =>
    !seasonOnly.value || entry.seasonalIngredientIds.length > 0;

  return {
    query,
    macroFilter,
    timeFilter,
    seasonOnly,
    filteredEntries: computed((): LibraryEntry[] =>
      toValue(entries).filter(
        (entry): boolean =>
          matchesMacro(entry) && matchesTime(entry) && matchesSeason(entry) && matchesQuery(entry),
      ),
    ),
    reset: (): void => {
      query.value = '';
      macroFilter.value = 'all';
      timeFilter.value = 'all';
      seasonOnly.value = false;
    },
  };
};
