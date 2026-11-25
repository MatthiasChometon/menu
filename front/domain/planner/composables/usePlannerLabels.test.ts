import { afterAll, describe, expect, it } from 'vitest';
import type { DishFilter } from './usePlannerLabels';
import type { RecipeSlot } from '~~/domain/menu/types/menu.type';

const groups: RecipeSlot[] = ['main', 'breakfast', 'postWorkout', 'snack'];
const filters: DishFilter[] = ['all', 'fish', 'meat', 'veggie', 'quick'];

const setLocale = async (code: 'fr' | 'en'): Promise<void> => {
  await useNuxtApp().$i18n.setLocale(code);
};

afterAll(async (): Promise<void> => {
  await setLocale('fr');
});

// A missing key does not throw: vue-i18n prints the key itself ("planner.group.main").
describe.each(['fr', 'en'] as const)('usePlannerLabels in %s', (code) => {
  it('resolves every label to real text, never to its key', async () => {
    await setLocale(code);
    const { groupLabel, groupHint, filterLabel, gaugeSideLabel, balanceSideLabel } =
      usePlannerLabels();

    const resolved = [
      ...groups.map(groupLabel),
      ...groups.map(groupHint),
      ...filters.map(filterLabel),
      gaugeSideLabel(-1),
      gaugeSideLabel(1),
      balanceSideLabel(-1),
      balanceSideLabel(1),
    ];

    expect(resolved).toHaveLength(4 + 4 + 5 + 2 + 2);
    for (const label of resolved) {
      expect(label).not.toBe('');
      expect(label).not.toMatch(/^planner\./);
    }
  });

  it('tells a shortfall from an excess', async () => {
    await setLocale(code);
    const { gaugeSideLabel, balanceSideLabel } = usePlannerLabels();

    expect(gaugeSideLabel(-5)).not.toBe(gaugeSideLabel(5));
    expect(balanceSideLabel(-5)).not.toBe(balanceSideLabel(5));
  });
});
