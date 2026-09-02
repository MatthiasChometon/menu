type MealPointer = { day: DayKey; slot: MealSlot };

const pointerKey = (day: DayKey, slot: MealSlot): string => `${day}:${slot}`;

// One store per week: content traded on one week's board has nothing to do
// with another week's.
const swapStores = new Map<string, Ref<Record<string, MealPointer>>>();

const swapsFor = (weekOf: string): Ref<Record<string, MealPointer>> => {
  const existing = swapStores.get(weekOf);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<Record<string, MealPointer>>(`mealSwap:${weekOf}`, {});
  swapStores.set(weekOf, created);
  return created;
};

// Every slot points at the plan by default — its own day and slot. Trading two
// slots only ever exchanges what they point to, never the plan underneath, so
// undoing every swap always lands back on exactly what was planned.
export const useMealSwap = (
  week: MaybeRefOrGetter<string>,
): {
  sourceOf: (day: DayKey, slot: MealSlot) => MealPointer;
  isSwapped: (day: DayKey, slot: MealSlot) => boolean;
  swapMeal: (dayA: DayKey, slotA: MealSlot, dayB: DayKey, slotB: MealSlot) => void;
  swapDay: (dayA: DayKey, dayB: DayKey, slots: MealSlot[]) => void;
  reset: () => void;
} => {
  const swaps = computed((): Record<string, MealPointer> => swapsFor(toValue(week)).value);

  const sourceOf = (day: DayKey, slot: MealSlot): MealPointer =>
    swaps.value[pointerKey(day, slot)] ?? { day, slot };

  const swapMeal = (dayA: DayKey, slotA: MealSlot, dayB: DayKey, slotB: MealSlot): void => {
    const store = swapsFor(toValue(week));
    const keyA = pointerKey(dayA, slotA);
    const keyB = pointerKey(dayB, slotB);

    store.value = {
      ...store.value,
      [keyA]: sourceOf(dayB, slotB),
      [keyB]: sourceOf(dayA, slotA),
    };
  };

  return {
    sourceOf,
    isSwapped: (day: DayKey, slot: MealSlot): boolean => {
      const source = sourceOf(day, slot);
      return source.day !== day || source.slot !== slot;
    },
    swapMeal,
    swapDay: (dayA: DayKey, dayB: DayKey, slots: MealSlot[]): void => {
      for (const slot of slots) swapMeal(dayA, slot, dayB, slot);
    },
    reset: (): void => {
      swapsFor(toValue(week)).value = {};
    },
  };
};
