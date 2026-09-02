import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import RecipeCard from './RecipeCard.vue';

const entryOf = (overrides: Partial<LibraryEntry> = {}): LibraryEntry => {
  const { recipeOf } = useRecipes();
  const recipe = recipeOf('chiliChicken');
  if (recipe === undefined) throw new Error('missing fixture recipe');

  return {
    recipe,
    dominantMacro: 'protein',
    prepBucket: 'medium',
    ingredientIds: ['chickenBreast', 'brownRice'],
    seasonalIngredientIds: [],
    ...overrides,
  };
};

describe('LibraryRecipeCard', () => {
  it('names the recipe and links to it', async () => {
    const wrapper = await mountSuspended(RecipeCard, { props: { entry: entryOf() } });

    expect(wrapper.text()).toContain('poulet');
    expect(wrapper.find('a').attributes('href')).toContain('chiliChicken');
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
});
