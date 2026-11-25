import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

// The household never answers: the copy on the device is all there is, so what
// it holds is what the list weighs for.
mockNuxtImport('useHouseholdQuantities', () => (): object => ({
  eaters: ref([]),
  isLoading: ref(false),
}));

const storedEatersAfter = async (stored: unknown): Promise<number> => {
  localStorage.setItem('shopping:eaters', JSON.stringify(stored));
  vi.resetModules();
  const { useShoppingQuantities } = await import('./useShoppingQuantities');
  let count = -1;
  mount({
    setup: (): Record<string, never> => {
      count = useShoppingQuantities().eaters.value.length;
      return {};
    },
    template: '<div />',
  });

  return count;
};

const eater = { id: 'me', name: 'Me', targets: { kcal: 3000 } };

describe('the household copy kept on the device', () => {
  it('reads a well-formed copy', async () => {
    expect(await storedEatersAfter([eater])).toBe(1);
  });

  it.each([
    ['a non-array', { me: eater }],
    ['a person without an id', [{ name: 'Me', targets: { kcal: 3000 } }]],
    ['a calorie target that is not a number', [{ ...eater, targets: { kcal: 'lots' } }]],
    ['one bad person among good ones', [eater, { id: 4 }]],
  ])('weighs for nobody when the copy holds %s', async (_name, stored) => {
    expect(await storedEatersAfter(stored)).toBe(0);
  });
});
