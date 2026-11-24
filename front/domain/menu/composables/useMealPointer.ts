import type { MealPointer } from '../types/flex.type';
import { useMenuBuilder } from './useMenuBuilder';

// The guard for a stored pointer at one slot of the week. Shared by the stores
// that persist pointers (swaps, leftovers), which read them back from
// localStorage as unknown.
export const useMealPointer = (): { isMealPointer: (value: unknown) => value is MealPointer } => {
  const { dayOrder, mealOrder } = useMenuBuilder();

  const isMealPointer = (value: unknown): value is MealPointer =>
    typeof value === 'object' &&
    value !== null &&
    'day' in value &&
    dayOrder.some((key): boolean => key === value.day) &&
    'slot' in value &&
    mealOrder.some((slot): boolean => slot === value.slot);

  return { isMealPointer };
};
