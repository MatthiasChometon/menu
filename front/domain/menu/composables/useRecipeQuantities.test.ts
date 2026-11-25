import { describe, expect, it } from 'vitest';

describe('the quantities of a recipe', () => {
  const { quantitiesOf } = useRecipeQuantities();
  const { recipes } = useRecipes();
  const recipe = Object.values(recipes)[0];
  if (recipe === undefined) throw new Error('empty catalogue');

  it('pairs each known ingredient with the grammes written in the recipe', () => {
    const quantities = quantitiesOf(recipe);

    expect(quantities).toHaveLength(Object.keys(recipe.ingredients).length);
    for (const { food, grams } of quantities) expect(recipe.ingredients[food.id]).toBe(grams);
  });

  it('leaves out an ingredient the catalogue does not know', () => {
    const quantities = quantitiesOf({
      ...recipe,
      ingredients: { ...recipe.ingredients, notAFood: 987654 },
    });

    expect(quantities).toHaveLength(Object.keys(recipe.ingredients).length);
    expect(quantities.some(({ grams }): boolean => grams === 987654)).toBe(false);
  });
});
