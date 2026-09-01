import type { WeightDraft, WeightEntry } from '../types/weight.type';

const STORAGE_KEY = 'weight-log';

// Wide enough to never reject a real body weight, narrow enough to catch a
// stray keystroke (65 typed as 605) before it wrecks the trend line.
const MIN_KG = 30;
const MAX_KG = 300;

const roundToOneDecimal = (value: number): number => Math.round(value * 10) / 10;

const byDateDescending = (a: WeightEntry, b: WeightEntry): number =>
  a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date);

// The diary of the number the whole feature turns around. Kept in
// localStorage for the MVP — see the page for the phase-2 server note — one
// shared store across every component that reads it, like the cooking diary.
export const useWeightLog = (): {
  entries: ComputedRef<WeightEntry[]>;
  bounds: { minKg: number; maxKg: number };
  todayDate: string;
  errorOf: (draft: WeightDraft) => string | undefined;
  add: (draft: WeightDraft) => void;
  update: (id: string, draft: WeightDraft) => void;
  remove: (id: string) => void;
  reset: () => void;
} => {
  const { t } = useNuxtApp().$i18n;
  const { todayDate, isValidDate } = useWeightDates();
  const store = useLocalStorage<WeightEntry[]>(STORAGE_KEY, []);
  const today = todayDate();

  const errorOf = (draft: WeightDraft): string | undefined => {
    if (!isValidDate(draft.date)) return t('weight.log.error.date');
    if (draft.date > today) return t('weight.log.error.future');
    if (!Number.isFinite(draft.kg) || draft.kg < MIN_KG || draft.kg > MAX_KG)
      return t('weight.log.error.range');

    return undefined;
  };

  return {
    entries: computed((): WeightEntry[] => [...store.value].sort(byDateDescending)),
    bounds: { minKg: MIN_KG, maxKg: MAX_KG },
    todayDate: today,
    errorOf,
    add: (draft: WeightDraft): void => {
      if (errorOf(draft) !== undefined) return;

      store.value = [
        ...store.value,
        { id: crypto.randomUUID(), date: draft.date, kg: roundToOneDecimal(draft.kg) },
      ];
    },
    update: (id: string, draft: WeightDraft): void => {
      if (errorOf(draft) !== undefined) return;

      store.value = store.value.map((entry): WeightEntry =>
        entry.id === id ? { ...entry, date: draft.date, kg: roundToOneDecimal(draft.kg) } : entry,
      );
    },
    remove: (id: string): void => {
      store.value = store.value.filter((entry): boolean => entry.id !== id);
    },
    reset: (): void => {
      store.value = [];
    },
  };
};
