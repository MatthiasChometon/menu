import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecipeCard from './RecipeCard.vue';

const { state, remove } = vi.hoisted(() => ({
  state: { ownedIds: [] as string[] },
  remove: vi.fn(),
}));

mockNuxtImport(
  'useMyRecipes',
  () => (): { recipes: Ref<{ id: string }[]>; remove: typeof remove } => ({
    recipes: ref(state.ownedIds.map((id): { id: string } => ({ id }))),
    remove,
  }),
);

beforeEach((): void => {
  state.ownedIds = [];
  remove.mockReset();
});

const entryOf = (overrides: Partial<LibraryEntry> = {}): LibraryEntry => {
  const { recipeOf } = useRecipes();
  const recipe = recipeOf('teriyakiSalmonBowl');
  if (recipe === undefined) throw new Error('missing fixture recipe');

  return {
    recipe,
    dominantMacro: 'protein',
    prepBucket: 'medium',
    ingredientIds: ['salmon', 'brownRice'],
    seasonalIngredientIds: [],
    ...overrides,
  };
};

describe('LibraryRecipeCard', () => {
  it('names the recipe and links to it', async () => {
    const wrapper = await mountSuspended(RecipeCard, { props: { entry: entryOf() } });

    expect(wrapper.text()).toContain('saumon');
    expect(wrapper.find('a').attributes('href')).toContain('teriyakiSalmonBowl');
  });

  it('shows the prep time and the dominant macro', async () => {
    const wrapper = await mountSuspended(RecipeCard, {
      props: { entry: entryOf({ dominantMacro: 'carbs' }) },
    });

    expect(wrapper.text()).toContain('25');
    expect(wrapper.text()).toContain('Gluc.');
  });

  it('flags a recipe with a seasonal ingredient', async () => {
    const wrapper = await mountSuspended(RecipeCard, {
      props: { entry: entryOf({ seasonalIngredientIds: ['bellPepper'] }) },
    });

    expect(wrapper.text()).toContain('De saison');
  });

  it('stays quiet about season when nothing in the pan is seasonal', async () => {
    const wrapper = await mountSuspended(RecipeCard, {
      props: { entry: entryOf({ seasonalIngredientIds: [] }) },
    });

    expect(wrapper.text()).not.toContain('De saison');
  });

  it('says so, in an alert, when one of the own recipes could not be removed', async () => {
    state.ownedIds = ['teriyakiSalmonBowl'];
    remove.mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(RecipeCard, { props: { entry: entryOf() } });

    await wrapper.find('button[aria-label="Supprimer"]').trigger('click');
    const confirm = wrapper
      .findAll('button')
      .find((button): boolean => button.text() === 'Supprimer');
    await confirm?.trigger('click');
    await flushPromises();

    expect(remove).toHaveBeenCalledWith('teriyakiSalmonBowl');
    expect(wrapper.find('[role="alert"]').text()).toContain('La suppression a échoué');
  });
});
