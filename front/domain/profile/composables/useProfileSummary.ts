import type { Targets } from './useProfile';

export const useProfileSummary = (): {
  targetRows: (targets: Targets) => { label: string; value: string }[];
} => {
  const { t } = useNuxtApp().$i18n;

  return {
    targetRows: (targets: Targets): { label: string; value: string }[] => [
      { label: t('profile.summary.kcal'), value: `${targets.kcal} kcal` },
      { label: t('profile.summary.protein'), value: `${targets.protein} g` },
      { label: t('profile.summary.fat'), value: `${targets.fat} g` },
      { label: t('profile.summary.carbs'), value: `${targets.carbs} g` },
      { label: t('profile.summary.fiber'), value: `${targets.fiber} g` },
    ],
  };
};
