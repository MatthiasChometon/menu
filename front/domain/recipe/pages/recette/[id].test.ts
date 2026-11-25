import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecipePage from './[id].vue';

const { state, refresh } = vi.hoisted(() => ({
  state: { hasFailed: false },
  refresh: vi.fn(),
}));

mockNuxtImport('useRoute', () => (): { params: { id: string } } => ({
  params: { id: 'chiliChicken' },
}));

mockNuxtImport(
  'useRecipes',
  () =>
    (): {
      recipeOf: () => unknown;
      imageOf: () => undefined;
    } => ({
      recipeOf: (): unknown => ({
        id: 'chiliChicken',
        slot: 'MAIN',
        name: { fr: 'Poulet au piment', en: 'Chilli chicken' },
        prepMinutes: 20,
        batch: false,
        ingredients: {},
        seasonings: [],
        steps: { fr: ['Cuire.'], en: ['Cook.'] },
      }),
      imageOf: (): undefined => undefined,
    }),
);

mockNuxtImport('useSelectedWeek', () => (): { selectedMenu: Ref<{ targets: undefined }> } => ({
  selectedMenu: ref({ targets: undefined }),
}));

mockNuxtImport(
  'useMyQuantities',
  () =>
    (): {
      isPersonalised: Ref<boolean>;
      scale: (quantities: unknown[]) => unknown[];
    } => ({ isPersonalised: ref(false), scale: (quantities): unknown[] => quantities }),
);

mockNuxtImport(
  'useRecipeVariants',
  () =>
    (): {
      variantsOf: () => unknown[];
      portionsOf: () => number;
      weekQuantitiesOf: () => unknown[];
    } => ({
      variantsOf: (): unknown[] => [
        {
          id: 'single',
          isReduced: false,
          quantities: [],
          macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
          servings: [],
        },
      ],
      portionsOf: (): number => 1,
      weekQuantitiesOf: (): unknown[] => [],
    }),
);

mockNuxtImport(
  'useHouseholdQuantities',
  () =>
    (): {
      isLoading: Ref<boolean>;
      hasFailed: Ref<boolean>;
      refresh: typeof refresh;
      scale: (quantities: unknown[]) => unknown[];
    } => ({
      isLoading: ref(false),
      hasFailed: ref(state.hasFailed),
      refresh,
      scale: (): unknown[] => [],
    }),
);

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
  state.hasFailed = false;
  refresh.mockReset();
});

describe('the recipe page', () => {
  it('shows no warning when the profile and the household loaded', async () => {
    const wrapper = await mountSuspended(RecipePage);

    expect(wrapper.text()).not.toContain("n'ont pas pu être chargées");
  });

  it('says the portions could not be weighed for the reader, and offers to retry', async () => {
    state.hasFailed = true;

    const wrapper = await mountSuspended(RecipePage);

    expect(wrapper.find('[role="alert"]').text()).toContain("n'ont pas pu être chargées");

    const retry = wrapper
      .findAll('button')
      .find((candidate): boolean => candidate.text() === 'Réessayer');
    await retry?.trigger('click');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
