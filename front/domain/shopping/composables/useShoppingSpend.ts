// What the reader actually paid for a week's shopping, to set against the
// menu's own estimate. Kept on the device per week, like the cart and the
// leftovers — a private note this browser holds, not account data shared with
// the household.
const stores = new Map<string, Ref<number | null>>();

// Null, not undefined, is what "nothing entered yet" round-trips as through
// localStorage: the storage boundary speaks JSON, where a missing value reads
// back as null rather than the undefined the rest of the app prefers.
const spendFor = (weekOf: string): Ref<number | null> => {
  const existing = stores.get(weekOf);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<number | null>(`shoppingSpend:${weekOf}`, null);
  stores.set(weekOf, created);
  return created;
};

export const useShoppingSpend = (
  week: MaybeRefOrGetter<string>,
): {
  actualEuros: ComputedRef<number | undefined>;
  setActual: (euros: number | undefined) => void;
} => ({
  actualEuros: computed((): number | undefined => spendFor(toValue(week)).value ?? undefined),
  // A blank field or a nonsensical amount clears the note rather than storing a
  // zero that would read as "I paid nothing".
  setActual: (euros: number | undefined): void => {
    spendFor(toValue(week)).value = euros === undefined || euros <= 0 ? null : euros;
  },
});
