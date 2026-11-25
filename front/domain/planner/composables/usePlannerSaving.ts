import { MAX_LENGTH, MIN_LENGTH } from './usePlannerWeek';
import type { PlannerDays } from './usePlannerDays';
import type { PlannerSelection } from './usePlannerSelection';
import type { PlannerSpread } from './usePlannerSpread';

const {
  groupSlots: GROUP_SLOTS,
  groupOrder: GROUP_ORDER,
  limits: GROUP_LIMITS,
} = usePlannerRules();

export type PlannerSaving = {
  isSaving: Ref<boolean>;
  savedAt: Ref<string | undefined>;
  /** The last attempt to save did not go through. */
  saveFailed: Ref<boolean>;
  /** The week could not be read from the account. The screen keeps what the tab
   *  holds, and loadFromAccount is the retry. */
  loadFailed: Ref<boolean>;
  canSave: ComputedRef<boolean>;
  save: () => Promise<void>;
  loadFromAccount: () => Promise<void>;
  /** Moves the screen to another week, parking the current one's work. */
  switchWeek: (week: string, previous: string | undefined) => void;
};

// The dishes a stored week was built from, read back out of the days. The
// account keeps the week, not the shortlist that produced it — and coming
// back to a week with the grid empty reads as if the week had been lost.
const chosenFrom = (stored: PlannedWeek): Partial<Record<RecipeSlot, string[]>> =>
  Object.fromEntries(
    GROUP_ORDER.map((group): [RecipeSlot, string[]] => [
      group,
      [
        ...new Set(
          Object.values(stored.days).flatMap((slots): string[] =>
            GROUP_SLOTS[group]
              .map((slot): string | undefined => slots[slot])
              .filter((id): id is string => id !== undefined),
          ),
        ),
      ].slice(0, GROUP_LIMITS[group].max),
    ]),
  );

// What leaves the browser and what comes back: saving the week to the account,
// reading it back, and parking one week's work while another is on screen.
export const usePlannerSaving = (
  { plan, locked, isDirty }: PlannerDays,
  { chosenDishes, step }: PlannerSelection,
  { spreadFrom, spreadSignature, length }: PlannerSpread,
): PlannerSaving => {
  const { week: plannerWeek } = usePlannerWeek();
  const { user } = useAuth();
  const { load, save: persist } = useWeekPlanStore();
  const { reportError } = useErrorReporting();

  const isSaving = useState<boolean>('planner:saving', (): boolean => false);
  const savedAt = useState<string | undefined>('planner:savedAt', (): undefined => undefined);
  const saveFailed = useState<boolean>('planner:saveFailed', (): boolean => false);
  const loadFailed = useState<boolean>('planner:loadFailed', (): boolean => false);
  const loadedWeek = useState<string | undefined>('planner:loaded', (): undefined => undefined);
  // One week's work in progress each, kept for as long as the tab lives.
  const drafts = useState<Record<string, WeekDraft>>(
    'planner:drafts',
    (): Record<string, WeekDraft> => ({}),
  );

  // Only what belongs to an account can be stored on one, and only a week that
  // changed is worth writing. Never while the stored week could not be read:
  // what is on screen would overwrite one nobody has seen.
  const canSave = computed(
    (): boolean =>
      user.value !== undefined && plannerWeek.value !== '' && isDirty.value && !loadFailed.value,
  );

  const save = async (): Promise<void> => {
    if (!canSave.value || isSaving.value) return;

    isSaving.value = true;
    saveFailed.value = false;
    try {
      savedAt.value = await persist({ ...plan.value, weekOf: plannerWeek.value });
      isDirty.value = false;
    } catch (error) {
      // Surfaced through saveFailed: the button used to go back to how it
      // looked, and the week appeared saved when nothing had left the browser.
      saveFailed.value = true;
      reportError('planner:save', error);
    } finally {
      isSaving.value = false;
    }
  };

  const loadFromAccount = async (): Promise<void> => {
    const week = plannerWeek.value;
    if (user.value === undefined || week === '' || loadedWeek.value === week) return;

    loadedWeek.value = week;
    let stored: PlannedWeek | undefined;
    try {
      stored = await load(week);
    } catch (error) {
      // Not "nothing stored": the week may well exist. Whatever the tab holds
      // stays on screen, the week is marked unread so a retry can try again, and
      // the page says so instead of offering a blank week to overwrite it with.
      loadedWeek.value = undefined;
      loadFailed.value = true;
      reportError('planner:load', error);

      return;
    }
    loadFailed.value = false;

    // A week with nothing stored starts blank. Keeping the previous week's
    // choices on screen would offer them up for saving under a date they were
    // never chosen for.
    plan.value = stored ?? { weekOf: week, days: {} };
    chosenDishes.value = stored === undefined ? {} : chosenFrom(stored);
    // A stored week carries its own length: as many days as were saved. Read it
    // back so the window opens the size it was composed at, not the default.
    if (stored !== undefined) {
      const savedDays = Object.keys(stored.days).length;
      if (savedDays > 0) length.value = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, savedDays));
    }
    spreadFrom.value = stored === undefined ? '' : spreadSignature();
    savedAt.value = undefined;
    saveFailed.value = false;
    isDirty.value = false;
    // Locks are a local editing aid, never part of what the account stores —
    // a week freshly read back starts with nothing pinned.
    locked.value = {};
  };

  // Switching weeks is switching subjects: whatever is on screen belongs to the
  // week it was read from, and cannot be carried over. What it can do is wait —
  // an afternoon of choices must not be lost to a mis-tapped arrow, and coming
  // back has to bring them back exactly as they were.
  const switchWeek = (week: string, previous: string | undefined): void => {
    if (week === '' || week === previous) return;

    if (previous !== undefined && previous !== '')
      drafts.value[previous] = {
        plan: plan.value,
        chosen: chosenDishes.value,
        spreadFrom: spreadFrom.value,
        isDirty: isDirty.value,
        locked: locked.value,
      };

    step.value = 0;
    savedAt.value = undefined;
    saveFailed.value = false;
    loadFailed.value = false;

    const draft = drafts.value[week];
    if (draft !== undefined) {
      plan.value = draft.plan;
      chosenDishes.value = draft.chosen;
      spreadFrom.value = draft.spreadFrom;
      isDirty.value = draft.isDirty;
      locked.value = draft.locked;

      return;
    }

    plan.value = { weekOf: week, days: {} };
    chosenDishes.value = {};
    spreadFrom.value = '';
    isDirty.value = false;
    locked.value = {};
    // A failed read is already reported and flagged by `loadFromAccount`; this
    // only catches what it did not foresee, and never reports a failure twice.
    loadFromAccount().catch((failure: unknown): void => reportError('planner:switchWeek', failure));
  };

  return { isSaving, savedAt, saveFailed, loadFailed, canSave, save, loadFromAccount, switchWeek };
};
