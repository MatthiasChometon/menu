import type { WeightDraft } from '../types/weight.type';

// Wide enough to never reject a real body weight, narrow enough to catch a
// stray keystroke (65 typed as 605) before it wrecks the trend line.
const MIN_KG = 30;
const MAX_KG = 300;

// Kept apart from the diary itself (useWeightLog): what counts as a valid
// weigh-in is pure logic worth testing on its own, whether the diary lives in
// localStorage or on the server.
export const useWeightValidation = (): {
  bounds: { minKg: number; maxKg: number };
  todayDate: string;
  errorOf: (draft: WeightDraft) => string | undefined;
} => {
  const { t } = useNuxtApp().$i18n;
  const { todayDate, isValidDate } = useWeightDates();
  const today = todayDate();

  const errorOf = (draft: WeightDraft): string | undefined => {
    if (!isValidDate(draft.date)) return t('weight.log.error.date');
    if (draft.date > today) return t('weight.log.error.future');
    if (!Number.isFinite(draft.kg) || draft.kg < MIN_KG || draft.kg > MAX_KG)
      return t('weight.log.error.range');

    return undefined;
  };

  return {
    bounds: { minKg: MIN_KG, maxKg: MAX_KG },
    todayDate: today,
    errorOf,
  };
};
