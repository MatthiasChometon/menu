import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('useNavigation', () => {
  it('lists the five destinations, in order', () => {
    const { entries } = useNavigation();

    expect(entries.value.map((entry): string => entry.label)).toEqual([
      "Aujourd'hui",
      'Semaine',
      'Courses',
      'Progrès',
      'Recettes',
    ]);
  });

  it('reads a route as current whether or not it carries a trailing slash', () => {
    const { entries, isCurrent } = useNavigation();
    const week = entries.value[1]?.to ?? '/';

    expect(isCurrent(week)).toBe(true);
    expect(isCurrent(`${week}nope`)).toBe(false);
  });
});
