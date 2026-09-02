import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('useNavigation', () => {
  it('keeps the mobile bar to four destinations and tucks the rest behind "Plus"', () => {
    const { primaryEntries, moreEntries } = useNavigation();

    expect(primaryEntries.value).toHaveLength(4);
    expect(moreEntries.value).toHaveLength(4);
  });

  it('never drops or duplicates a route across the two groups', () => {
    const { entries, primaryEntries, moreEntries } = useNavigation();

    const grouped = [...primaryEntries.value, ...moreEntries.value]
      .map((entry): string => entry.to)
      .sort();
    const all = entries.value.map((entry): string => entry.to).sort();

    expect(grouped).toEqual(all);
  });

  it('reads today, the week, shopping and the composer as the ones reached for most', () => {
    const { primaryEntries } = useNavigation();

    expect(primaryEntries.value.map((entry): string => entry.label)).toEqual([
      "Aujourd'hui",
      'Semaine',
      'Courses',
      'Composer',
    ]);
  });
});
