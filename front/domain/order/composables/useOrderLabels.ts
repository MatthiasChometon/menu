import type { GroceryJob } from './useGroceryOrder';

type Period = 'morning' | 'afternoon' | 'evening';
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type OrderLabels = {
  statusLabel: (status: GroceryJob['status']) => string;
  periodLabel: (period: Period) => string;
  weekdayLabel: (weekday: Weekday) => string;
};

// Every label is a literal key, so the translation checker can see which ones
// are used: a key built from a variable is invisible to it and rots silently.
export const useOrderLabels = (): OrderLabels => {
  const { t } = useNuxtApp().$i18n;

  const statuses = computed((): Record<GroceryJob['status'], string> => ({
    PENDING: t('order.status.PENDING'),
    RUNNING: t('order.status.RUNNING'),
    SUCCEEDED: t('order.status.SUCCEEDED'),
    FAILED: t('order.status.FAILED'),
    BLOCKED: t('order.status.BLOCKED'),
  }));

  const periods = computed((): Record<Period, string> => ({
    morning: t('order.slots.morning'),
    afternoon: t('order.slots.afternoon'),
    evening: t('order.slots.evening'),
  }));

  const weekdays = computed((): Record<Weekday, string> => ({
    1: t('order.weekday.1'),
    2: t('order.weekday.2'),
    3: t('order.weekday.3'),
    4: t('order.weekday.4'),
    5: t('order.weekday.5'),
    6: t('order.weekday.6'),
    7: t('order.weekday.7'),
  }));

  return {
    statusLabel: (status): string => statuses.value[status],
    periodLabel: (period): string => periods.value[period],
    weekdayLabel: (weekday): string => weekdays.value[weekday],
  };
};
