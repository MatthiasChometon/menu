import { Goal } from '#gql/default';
import { afterAll, describe, expect, it } from 'vitest';
import type { DayKey, Macros, MealSlot, WeekName, WeekStatus } from '../types/menu.type';

const days: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];
const slots: MealSlot[] = ['breakfast', 'postWorkout', 'lunch', 'snack', 'dinner'];
const macros: (keyof Macros)[] = ['kcal', 'protein', 'fat', 'carbs', 'fiber'];
const weeks: (WeekName | WeekStatus)[] = ['last', 'current', 'next', 'upcoming', 'past'];

const setLocale = async (code: 'fr' | 'en'): Promise<void> => {
  await useNuxtApp().$i18n.setLocale(code);
};

afterAll(async (): Promise<void> => {
  await setLocale('fr');
});

// A missing key does not throw: vue-i18n prints the key itself ("menu.day.monday").
// Every label has to resolve to real text, in every locale the app ships.
describe.each(['fr', 'en'] as const)('useMenuLabels in %s', (code) => {
  const labels = async (): Promise<string[]> => {
    await setLocale(code);
    const {
      dayLabel,
      mealLabel,
      mealTimeLabel,
      macroShortLabel,
      macroLabel,
      macroLongLabel,
      weekLabel,
      weighInReminder,
    } = useMenuLabels();

    return [
      ...days.map(dayLabel),
      ...slots.map(mealLabel),
      ...slots.map(mealTimeLabel),
      ...macros.map(macroShortLabel),
      ...macros.map(macroLabel),
      ...macros.map(macroLongLabel),
      ...weeks.map(weekLabel),
      ...Object.values(Goal).map(weighInReminder),
    ];
  };

  it('resolves every label to real text, never to its key', async () => {
    const resolved = await labels();

    expect(resolved).toHaveLength(7 + 5 + 5 + 5 + 5 + 5 + 5 + 3);
    for (const label of resolved) {
      expect(label).not.toBe('');
      expect(label).not.toMatch(/^menu\./);
    }
  });
});

describe('useMenuLabels', () => {
  it('follows the locale', async () => {
    await setLocale('fr');
    expect(useMenuLabels().dayLabel('monday')).toBe('Lundi');

    await setLocale('en');
    expect(useMenuLabels().dayLabel('monday')).toBe('Monday');
  });
});
