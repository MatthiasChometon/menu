type LeftoverDecision = 'used' | 'declined';

const mealKey = (day: DayKey, slot: MealSlot): string => `${day}:${slot}`;

// One pair of stores per week. The origin (where the leftovers came from) and
// the decision about a later slot (use them there, or stick to the plan) are
// kept apart: declaring a leftover does not itself decide what happens with
// it, and a slot can be decided on well after the pot it might reuse.
const originStores = new Map<string, Ref<string[]>>();
const decisionStores = new Map<string, Ref<Record<string, LeftoverDecision>>>();

const originsFor = (weekOf: string): Ref<string[]> => {
  const existing = originStores.get(weekOf);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<string[]>(`leftoverOrigins:${weekOf}`, []);
  originStores.set(weekOf, created);
  return created;
};

const decisionsFor = (weekOf: string): Ref<Record<string, LeftoverDecision>> => {
  const existing = decisionStores.get(weekOf);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<Record<string, LeftoverDecision>>(`leftoverDecisions:${weekOf}`, {});
  decisionStores.set(weekOf, created);
  return created;
};

// A pot in the fridge outlives the meal it was cooked for: marking one here
// says tomorrow's version of that slot can be it again, instead of a fresh
// cook or a shop trip.
export const useLeftovers = (
  week: MaybeRefOrGetter<string>,
): {
  hasLeftover: (day: DayKey, slot: MealSlot) => boolean;
  markLeftover: (day: DayKey, slot: MealSlot) => void;
  clearLeftover: (day: DayKey, slot: MealSlot) => void;
  decisionAt: (day: DayKey, slot: MealSlot) => LeftoverDecision | undefined;
  useLeftoverHere: (day: DayKey, slot: MealSlot) => void;
  declineLeftover: (day: DayKey, slot: MealSlot) => void;
  clearDecision: (day: DayKey, slot: MealSlot) => void;
  reset: () => void;
} => {
  const origins = computed((): string[] => originsFor(toValue(week)).value);
  const decisions = computed((): Record<string, LeftoverDecision> => decisionsFor(toValue(week)).value);

  const setDecision = (day: DayKey, slot: MealSlot, decision: LeftoverDecision): void => {
    const store = decisionsFor(toValue(week));
    store.value = { ...store.value, [mealKey(day, slot)]: decision };
  };

  return {
    hasLeftover: (day: DayKey, slot: MealSlot): boolean => origins.value.includes(mealKey(day, slot)),
    markLeftover: (day: DayKey, slot: MealSlot): void => {
      const store = originsFor(toValue(week));
      const key = mealKey(day, slot);
      if (!store.value.includes(key)) store.value = [...store.value, key];
    },
    clearLeftover: (day: DayKey, slot: MealSlot): void => {
      const store = originsFor(toValue(week));
      const key = mealKey(day, slot);
      store.value = store.value.filter((entry): boolean => entry !== key);
    },
    decisionAt: (day: DayKey, slot: MealSlot): LeftoverDecision | undefined =>
      decisions.value[mealKey(day, slot)],
    useLeftoverHere: (day: DayKey, slot: MealSlot): void => setDecision(day, slot, 'used'),
    declineLeftover: (day: DayKey, slot: MealSlot): void => setDecision(day, slot, 'declined'),
    clearDecision: (day: DayKey, slot: MealSlot): void => {
      const store = decisionsFor(toValue(week));
      const key = mealKey(day, slot);
      store.value = Object.fromEntries(
        Object.entries(store.value).filter(([entry]): boolean => entry !== key),
      );
    },
    reset: (): void => {
      originsFor(toValue(week)).value = [];
      decisionsFor(toValue(week)).value = {};
    },
  };
};
