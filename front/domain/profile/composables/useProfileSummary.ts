import type { Profile, Targets } from './useProfile';

export const useProfileSummary = (): {
  targetRows: (targets: Targets) => { label: string; value: string }[];
  goalLabelOf: (profile: Profile) => string;
  goalIconOf: (profile: Profile) => string;
} => {
  const { t } = useNuxtApp().$i18n;

  // The icon says the direction at a glance — down, level, up — which is what
  // someone checks when they open this page.
  const icons: Record<string, string> = {
    LOSE_FAT: 'i-lucide-trending-down',
    MAINTAIN: 'i-lucide-minus',
    GAIN_MUSCLE: 'i-lucide-trending-up',
  };

  return {
    targetRows: (targets: Targets): { label: string; value: string }[] => [
      { label: t('profile.summary.kcal'), value: `${targets.kcal} kcal` },
      { label: t('profile.summary.protein'), value: `${targets.protein} g` },
      { label: t('profile.summary.fat'), value: `${targets.fat} g` },
      { label: t('profile.summary.carbs'), value: `${targets.carbs} g` },
      { label: t('profile.summary.fiber'), value: `${targets.fiber} g` },
    ],
    goalLabelOf: (profile: Profile): string => t(`profile.goal.${profile.goal}`),
    goalIconOf: (profile: Profile): string => icons[profile.goal] ?? 'i-lucide-target',
  };
};
