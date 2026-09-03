type LeftoverDecision = 'used' | 'declined';

type MealPointer = { day: DayKey; slot: MealSlot };

// One side reused for a leftover kept for a chosen slot: where it came from,
// and where it is now standing in for the planned dish.
type LeftoverAssignment = { origin: MealPointer; target: MealPointer };

const mealKey = (day: DayKey, slot: MealSlot): string => `${day}:${slot}`;

const samePointer = (left: MealPointer, right: MealPointer): boolean =>
  left.day === right.day && left.slot === right.slot;

// Three stores per week. The origin (where the leftovers came from), the
// decision about the next day's version of the same slot (use them there, or
// stick to the plan), and the explicit assignments (this exact slot, chosen on
// purpose, however far out) are kept apart: declaring a leftover does not
// itself decide what happens with it, and picking a slot on purpose is a
// different act from nudging the very next day.
const originStores = new Map<string, Ref<string[]>>();
const decisionStores = new Map<string, Ref<Record<string, LeftoverDecision>>>();
const assignmentStores = new Map<string, Ref<LeftoverAssignment[]>>();

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

const assignmentsFor = (weekOf: string): Ref<LeftoverAssignment[]> => {
  const existing = assignmentStores.get(weekOf);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<LeftoverAssignment[]>(`leftoverAssignments:${weekOf}`, []);
  assignmentStores.set(weekOf, created);
  return created;
};

// A pot in the fridge outlives the meal it was cooked for: marking one here
// says tomorrow's version of that slot can be it again, instead of a fresh
// cook or a shop trip. Choosing a slot on purpose — however far out — is the
// same idea made explicit, so it lives here too.
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
  /** The dish standing in at this slot, when it was chosen on purpose rather
   *  than nudged from the day before. */
  assignedOriginOf: (day: DayKey, slot: MealSlot) => MealPointer | undefined;
  /** Where this dish's leftovers were sent, if they were. */
  assignedTargetOf: (day: DayKey, slot: MealSlot) => MealPointer | undefined;
  /** Sends the origin's leftovers to the target slot, replacing whatever that
   *  origin was already sending elsewhere and whatever the target was already
   *  showing. */
  assignLeftover: (originDay: DayKey, originSlot: MealSlot, targetDay: DayKey, targetSlot: MealSlot) => void;
  /** Drops the assignment this slot is part of, on either side of it. */
  clearAssignment: (day: DayKey, slot: MealSlot) => void;
  reset: () => void;
} => {
  const origins = computed((): string[] => originsFor(toValue(week)).value);
  const decisions = computed((): Record<string, LeftoverDecision> => decisionsFor(toValue(week)).value);
  const assignments = computed((): LeftoverAssignment[] => assignmentsFor(toValue(week)).value);

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
    assignedOriginOf: (day: DayKey, slot: MealSlot): MealPointer | undefined =>
      assignments.value.find((entry): boolean => samePointer(entry.target, { day, slot }))?.origin,
    assignedTargetOf: (day: DayKey, slot: MealSlot): MealPointer | undefined =>
      assignments.value.find((entry): boolean => samePointer(entry.origin, { day, slot }))?.target,
    assignLeftover: (
      originDay: DayKey,
      originSlot: MealSlot,
      targetDay: DayKey,
      targetSlot: MealSlot,
    ): void => {
      const origin = { day: originDay, slot: originSlot };
      const target = { day: targetDay, slot: targetSlot };
      const store = assignmentsFor(toValue(week));
      const withoutClashing = store.value.filter(
        (entry): boolean => !samePointer(entry.origin, origin) && !samePointer(entry.target, target),
      );
      store.value = [...withoutClashing, { origin, target }];
    },
    clearAssignment: (day: DayKey, slot: MealSlot): void => {
      const store = assignmentsFor(toValue(week));
      const pointer = { day, slot };
      store.value = store.value.filter(
        (entry): boolean => !samePointer(entry.origin, pointer) && !samePointer(entry.target, pointer),
      );
    },
    reset: (): void => {
      originsFor(toValue(week)).value = [];
      decisionsFor(toValue(week)).value = {};
      assignmentsFor(toValue(week)).value = [];
    },
  };
};
