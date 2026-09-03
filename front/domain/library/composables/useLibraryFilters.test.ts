import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const useLocale = async (code: 'fr' | 'en'): Promise<void> => {
  await useNuxtApp().$i18n.setLocale(code);
};

beforeEach(async () => {
  await useLocale('fr');
});

afterAll(async () => {
  await useLocale('en');
});

const entriesOfWeek = (month: number): LibraryEntry[] => {
  const { latestMenu } = useMenu();
  const { entriesOf } = useRecipeCatalog();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return entriesOf(latestMenu.recipes, month);
};

describe('useLibraryFilters', () => {
  it('keeps everything when nothing is filtered', () => {
    const entries = entriesOfWeek(9);
    const { filteredEntries } = useLibraryFilters(entries);

    expect(filteredEntries.value).toHaveLength(entries.length);
  });

  it('finds a recipe by its own name', () => {
    const entries = entriesOfWeek(9);
    const { query, filteredEntries } = useLibraryFilters(entries);

    query.value = 'teriyaki';

    expect(filteredEntries.value.map((entry): string => entry.recipe.id)).toContain(
      'teriyakiSalmonBowl',
    );
  });

  it('finds a recipe by an ingredient that is not in its name', () => {
    const entries = entriesOfWeek(9);
    const { query, filteredEntries } = useLibraryFilters(entries);

    query.value = 'carotte';

    const found = filteredEntries.value.find(
      (entry): boolean => entry.recipe.id === 'teriyakiSalmonBowl',
    );
    expect(found).toBeDefined();
  });

  it('narrows down to a single dominant macro', () => {
    const entries = entriesOfWeek(9);
    const { macroFilter, filteredEntries } = useLibraryFilters(entries);

    macroFilter.value = 'protein';

    expect(filteredEntries.value.every((entry): boolean => entry.dominantMacro === 'protein')).toBe(
      true,
    );
  });

  it('narrows down to a prep time bucket', () => {
    const entries = entriesOfWeek(9);
    const { timeFilter, filteredEntries } = useLibraryFilters(entries);

    timeFilter.value = 'quick';

    expect(filteredEntries.value.every((entry): boolean => entry.prepBucket === 'quick')).toBe(
      true,
    );
  });

  it('keeps only recipes with a seasonal ingredient when asked', () => {
    const entries = entriesOfWeek(9);
    const { seasonOnly, filteredEntries } = useLibraryFilters(entries);

    seasonOnly.value = true;

    expect(
      filteredEntries.value.every((entry): boolean => entry.seasonalIngredientIds.length > 0),
    ).toBe(true);
  });

  it('forgets every filter on reset', () => {
    const entries = entriesOfWeek(9);
    const { query, macroFilter, timeFilter, seasonOnly, reset, filteredEntries } =
      useLibraryFilters(entries);

    query.value = 'chili';
    macroFilter.value = 'protein';
    timeFilter.value = 'quick';
    seasonOnly.value = true;
    reset();

    expect(query.value).toBe('');
    expect(macroFilter.value).toBe('all');
    expect(timeFilter.value).toBe('all');
    expect(seasonOnly.value).toBe(false);
    expect(filteredEntries.value).toHaveLength(entries.length);
  });
});
