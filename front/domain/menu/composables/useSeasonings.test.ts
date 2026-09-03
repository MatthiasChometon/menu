import { describe, expect, it } from 'vitest';

describe('useSeasonings', () => {
  it('resolves what a recipe is seasoned with', () => {
    const { recipeOf } = useRecipes();
    const { seasoningsOf } = useSeasonings();

    const dish = recipeOf('teriyakiSalmonBowl');
    if (dish === undefined) throw new Error('no recipe to check');

    expect(seasoningsOf(dish).map((seasoning): string => seasoning.id)).toEqual([
      'ginger',
      'garlic',
      'soySauce',
      'pepper',
    ]);
  });

  it('ignores an unknown seasoning rather than breaking the recipe', () => {
    const { seasoningsOf } = useSeasonings();

    const recipe = { seasonings: ['cumin', 'saffron-we-do-not-stock'] } as Recipe;

    expect(seasoningsOf(recipe).map((seasoning): string => seasoning.id)).toEqual(['cumin']);
  });

  it('only puts the fresh aromatics on the shopping list', () => {
    const { latestMenu } = useMenu();
    const { freshOf } = useSeasonings();

    const fresh = freshOf(latestMenu?.recipes ?? []);

    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((seasoning): boolean => seasoning.fresh)).toBe(true);
  });

  it('buys one head of garlic however many recipes call for it', () => {
    const { recipeOf } = useRecipes();
    const { freshOf } = useSeasonings();

    const recipes = ['beefLentilBolognese', 'codRatatouilleRice', 'turkeyMeatballsRice']
      .map((id): Recipe | undefined => recipeOf(id))
      .filter((recipe): recipe is Recipe => recipe !== undefined);

    const ids = freshOf(recipes).map((seasoning): string => seasoning.id);

    expect(ids.filter((id): boolean => id === 'garlic')).toHaveLength(1);
  });
});
