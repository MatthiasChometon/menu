import { describe, expect, it } from 'vitest';

describe('useSeasonings', () => {
  it('resolves what a recipe is seasoned with', () => {
    const { recipeOf } = useRecipes();
    const { seasoningsOf } = useSeasonings();

    const chili = recipeOf('chiliChicken');
    if (chili === undefined) throw new Error('no chili recipe to check');

    expect(seasoningsOf(chili).map((seasoning): string => seasoning.id)).toEqual([
      'cumin',
      'smokedPaprika',
      'oregano',
      'chilli',
      'salt',
    ]);
  });

  it('ignores an unknown seasoning rather than breaking the recipe', () => {
    const { seasoningsOf } = useSeasonings();

    const recipe = { seasonings: ['cumin', 'saffron-we-do-not-stock'] } as Recipe;

    expect(seasoningsOf(recipe).map((seasoning): string => seasoning.id)).toEqual(['cumin']);
  });

  it('only puts the fresh aromatics on the shopping list', () => {
    const { currentMenu } = useMenu();
    const { freshOf } = useSeasonings();

    const fresh = freshOf(currentMenu?.recipes ?? []);

    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((seasoning): boolean => seasoning.fresh)).toBe(true);
  });

  it('buys one head of garlic however many recipes call for it', () => {
    const { recipeOf } = useRecipes();
    const { freshOf } = useSeasonings();

    const recipes = ['beefLentilBolognese', 'tunaPasta', 'porkWok']
      .map((id): Recipe | undefined => recipeOf(id))
      .filter((recipe): recipe is Recipe => recipe !== undefined);

    const ids = freshOf(recipes).map((seasoning): string => seasoning.id);

    expect(ids.filter((id): boolean => id === 'garlic')).toHaveLength(1);
  });
});
