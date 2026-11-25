import type { RecipeSlot } from '../../menu/types/menu.type';
import type { DishKind } from '../types/planner.type';

export type DishFilter = 'all' | DishKind | 'quick';

type PlannerLabels = {
  groupLabel: (group: RecipeSlot) => string;
  groupHint: (group: RecipeSlot) => string;
  filterLabel: (filter: DishFilter) => string;
  gaugeSideLabel: (gapPercent: number) => string;
  balanceSideLabel: (gapPercent: number) => string;
};

// Literal keys only (see useMenuLabels): a key built from a variable is invisible
// to the translation checker. The tables are computed so they follow the locale.
export const usePlannerLabels = (): PlannerLabels => {
  const { t } = useNuxtApp().$i18n;

  const groups = computed((): Record<RecipeSlot, string> => ({
    main: t('planner.group.main'),
    breakfast: t('planner.group.breakfast'),
    postWorkout: t('planner.group.postWorkout'),
    snack: t('planner.group.snack'),
  }));

  const hints = computed((): Record<RecipeSlot, string> => ({
    main: t('planner.groupHint.main'),
    breakfast: t('planner.groupHint.breakfast'),
    postWorkout: t('planner.groupHint.postWorkout'),
    snack: t('planner.groupHint.snack'),
  }));

  const filters = computed((): Record<DishFilter, string> => ({
    all: t('planner.filter.all'),
    fish: t('planner.filter.fish'),
    meat: t('planner.filter.meat'),
    veggie: t('planner.filter.veggie'),
    quick: t('planner.filter.quick'),
  }));

  return {
    groupLabel: (group: RecipeSlot): string => groups.value[group],
    groupHint: (group: RecipeSlot): string => hints.value[group],
    filterLabel: (filter: DishFilter): string => filters.value[filter],
    gaugeSideLabel: (gapPercent: number): string =>
      gapPercent < 0 ? t('planner.gauge.under') : t('planner.gauge.over'),
    balanceSideLabel: (gapPercent: number): string =>
      gapPercent < 0 ? t('planner.balance.short') : t('planner.balance.over'),
  };
};
