import { Goal } from '#gql/default';
import type { Profile, Targets } from './useProfile';

export const useProfileSummary = (): {
  targetRows: (targets: Targets) => { label: string; value: string }[];
  goalLabelOf: (profile: Profile) => string;
  goalIconOf: (profile: Profile) => string;
} => {
  const { t } = useNuxtApp().$i18n;

  // The icon says the direction at a glance — down, level, up — which is what
  // someone checks when they open this page.
  const icons: Record<Goal, string> = {
    [Goal.LOSE_FAT]: 'i-lucide-trending-down',
    [Goal.MAINTAIN]: 'i-lucide-minus',
    [Goal.GAIN_MUSCLE]: 'i-lucide-trending-up',
  };

  // Literal keys, so the translation checker sees every one of them.
  const goals = computed((): Record<Goal, string> => ({
    [Goal.LOSE_FAT]: t('profile.goal.LOSE_FAT'),
    [Goal.MAINTAIN]: t('profile.goal.MAINTAIN'),
    [Goal.GAIN_MUSCLE]: t('profile.goal.GAIN_MUSCLE'),
  }));

  return {
    targetRows: (targets: Targets): { label: string; value: string }[] => [
      { label: t('profile.summary.kcal'), value: `${targets.kcal} kcal` },
      { label: t('profile.summary.protein'), value: `${targets.protein} g` },
      { label: t('profile.summary.fat'), value: `${targets.fat} g` },
      { label: t('profile.summary.carbs'), value: `${targets.carbs} g` },
      { label: t('profile.summary.fiber'), value: `${targets.fiber} g` },
    ],
    goalLabelOf: (profile: Profile): string => goals.value[profile.goal],
    goalIconOf: (profile: Profile): string => icons[profile.goal],
  };
};
