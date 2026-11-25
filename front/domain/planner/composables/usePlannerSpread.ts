import type { ComposedWeekEntry } from './usePlannerHistory';
import type { PlannerDays } from './usePlannerDays';
import type { PlannerSelection } from './usePlannerSelection';

const { groupSlots: GROUP_SLOTS, groupOrder: GROUP_ORDER } = usePlannerRules();

export type PlannerSpread = {
  /** Weeks composed before this one, most recent first, offered as a base for
   *  a new one. */
  pastComposedWeeks: ComputedRef<ComposedWeekEntry[]>;
  /** How many days the window spans, 3 to 7. Two-way, so a selector can set it. */
  length: Ref<number>;
  canSpread: ComputedRef<boolean>;
  /** The selection changed since the week was last spread. */
  needsSpread: ComputedRef<boolean>;
  /** What a spread was built from, to compare the selection against later. */
  spreadFrom: Ref<string>;
  spreadSignature: () => string;
  spread: () => void;
  /** Starts this window from a week composed before: its picks replace the
   *  current selection and are spread straight away. */
  duplicateFrom: (sourceWeek: string) => void;
};

/** Rotation, with dinner one step ahead of lunch, so the same dish never lands
 *  twice in a day — the rule the week has always followed. */
export const slotsOnDay = (
  selection: Partial<Record<RecipeSlot, string[]>>,
  index: number,
): Partial<Record<MealSlot, string>> => {
  const slots: Partial<Record<MealSlot, string>> = {};

  for (const group of GROUP_ORDER) {
    const picked = selection[group] ?? [];
    if (picked.length === 0) continue;

    for (const [offset, slot] of GROUP_SLOTS[group].entries()) {
      const dish = picked[(index + offset) % picked.length];
      if (dish !== undefined) slots[slot] = dish;
    }
  }

  return slots;
};

// Turns the selection into days. Nothing can be spread until there is something
// to eat at midday: the savoury dishes are what the week is built around.
export const usePlannerSpread = (
  { plan, locked, windowDays, touch }: PlannerDays,
  { chosenDishes }: PlannerSelection,
): PlannerSpread => {
  const { week: plannerWeek, length } = usePlannerWeek();
  const { record: recordComposedWeek, entriesExcept: pastComposedWeeksOf } = usePlannerHistory();

  // What the selection looked like when the week was last spread, so a dish
  // swapped afterwards is not silently left out of it.
  const spreadFrom = useState<string>('planner:spreadFrom', (): string => '');

  const canSpread = computed((): boolean => (chosenDishes.value.main ?? []).length > 0);

  // What a spread was built from: the dishes and how many days they were spread
  // over. The length counts, so shortening the window re-spreads rather than
  // leaving the extra days behind.
  const spreadSignature = (): string =>
    JSON.stringify({ dishes: chosenDishes.value, length: length.value });

  const needsSpread = computed(
    (): boolean => canSpread.value && spreadFrom.value !== spreadSignature(),
  );

  const spread = (): void => {
    if (!canSpread.value) return;

    // Rebuilt from scratch over the window's days, so a day left over from a
    // longer window before is gone rather than lingering in the plan — except
    // a slot that was locked, which keeps the dish it was pinned with rather
    // than falling back into the rotation.
    plan.value.days = Object.fromEntries(
      windowDays.value.map((day, index): [DayKey, Partial<Record<MealSlot, string>>] => {
        const rotated = slotsOnDay(chosenDishes.value, index);
        const lockedSlots = locked.value[day];
        if (lockedSlots === undefined) return [day, rotated];

        const kept = plan.value.days[day] ?? {};
        const merged = { ...rotated };
        for (const slot of Object.keys(lockedSlots) as MealSlot[]) {
          const pinned = kept[slot];
          if (pinned !== undefined) merged[slot] = pinned;
        }

        return [day, merged];
      }),
    );

    spreadFrom.value = spreadSignature();
    touch();
    // A week only counts as composed once it actually lands on its days —
    // this is what the generator and the anti-repetition steering look back
    // on, kept locally so it works with no account at all.
    recordComposedWeek(plannerWeek.value, chosenDishes.value);
  };

  // Starts this window from a week composed before, so a good week can be
  // reused rather than rebuilt from a blank page. The picks replace the
  // current selection and are spread straight away — locked slots are left
  // alone, spread only ever overwrites what is not pinned.
  const duplicateFrom = (sourceWeek: string): void => {
    const source = pastComposedWeeksOf(plannerWeek.value).find(
      (entry): boolean => entry.weekOf === sourceWeek,
    );
    if (source === undefined) return;

    chosenDishes.value = { ...source.chosen };
    touch();
    spread();
  };

  return {
    pastComposedWeeks: computed((): ComposedWeekEntry[] => pastComposedWeeksOf(plannerWeek.value)),
    length,
    canSpread,
    needsSpread,
    spreadFrom,
    spreadSignature,
    spread,
    duplicateFrom,
  };
};
