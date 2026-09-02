const mealKey = (day: DayKey, slot: MealSlot): string => `${day}:${slot}`;

// One store per week, like the cooking diary: an override belongs to a
// specific plan, and switching weeks must never carry "eating out tonight"
// onto a week it was never said about.
const overrideStores = new Map<string, Ref<Record<string, MealOverrideKind>>>();

const overridesFor = (weekOf: string): Ref<Record<string, MealOverrideKind>> => {
  const existing = overrideStores.get(weekOf);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<Record<string, MealOverrideKind>>(`mealOverrides:${weekOf}`, {});
  overrideStores.set(weekOf, created);
  return created;
};

const without = (
  overrides: Record<string, MealOverrideKind>,
  key: string,
): Record<string, MealOverrideKind> =>
  Object.fromEntries(Object.entries(overrides).filter(([entry]): boolean => entry !== key));

// What the plan says to eat is not always what happens: a meal out, a treat
// that was never going to be weighed. Marking it here keeps the plan itself
// untouched and tells the rest of the app — the day's macros, the adherence
// ring — to leave that meal out rather than count it as missed.
export const useMealOverrides = (
  week: MaybeRefOrGetter<string>,
): {
  kindOf: (day: DayKey, slot: MealSlot) => MealOverrideKind | undefined;
  setEatingOut: (day: DayKey, slot: MealSlot) => void;
  setCheatMeal: (day: DayKey, slot: MealSlot) => void;
  clearOverride: (day: DayKey, slot: MealSlot) => void;
  /** Every one of the day's slots was marked as a cheat meal in one go. */
  isDayOff: (day: DayKey, slots: MealSlot[]) => boolean;
  setDayOff: (day: DayKey, slots: MealSlot[]) => void;
  clearDayOff: (day: DayKey, slots: MealSlot[]) => void;
  reset: () => void;
} => {
  const overrides = computed(
    (): Record<string, MealOverrideKind> => overridesFor(toValue(week)).value,
  );

  const kindOf = (day: DayKey, slot: MealSlot): MealOverrideKind | undefined =>
    overrides.value[mealKey(day, slot)];

  const setKind = (day: DayKey, slot: MealSlot, kind: MealOverrideKind): void => {
    const store = overridesFor(toValue(week));
    store.value = { ...store.value, [mealKey(day, slot)]: kind };
  };

  const clearOverride = (day: DayKey, slot: MealSlot): void => {
    const store = overridesFor(toValue(week));
    store.value = without(store.value, mealKey(day, slot));
  };

  return {
    kindOf,
    setEatingOut: (day: DayKey, slot: MealSlot): void => setKind(day, slot, 'eatingOut'),
    setCheatMeal: (day: DayKey, slot: MealSlot): void => setKind(day, slot, 'cheatMeal'),
    clearOverride,
    isDayOff: (day: DayKey, slots: MealSlot[]): boolean =>
      slots.length > 0 && slots.every((slot): boolean => kindOf(day, slot) === 'cheatMeal'),
    setDayOff: (day: DayKey, slots: MealSlot[]): void => {
      for (const slot of slots) setKind(day, slot, 'cheatMeal');
    },
    clearDayOff: (day: DayKey, slots: MealSlot[]): void => {
      for (const slot of slots) clearOverride(day, slot);
    },
    reset: (): void => {
      overridesFor(toValue(week)).value = {};
    },
  };
};
