import { describe, expect, it } from 'vitest';

const chiliChicken = (): Recipe => {
  const { recipeOf } = useRecipes();
  const recipe = recipeOf('chiliChicken');
  if (recipe === undefined) throw new Error('missing fixture recipe');
  return recipe;
};

describe('useRecipeCatalog', () => {
  it('describes a recipe by its dominant macro', () => {
    const { entriesOf } = useRecipeCatalog();

    const [entry] = entriesOf([chiliChicken()], 9);

    expect(['protein', 'carbs', 'fat']).toContain(entry?.dominantMacro);
  });

  it('buckets prep time as quick, medium or long', () => {
    const { entriesOf } = useRecipeCatalog();

    const [entry] = entriesOf([chiliChicken()], 9);

    // 25 minutes: past the quick cutoff, within the medium one.
    expect(entry?.prepBucket).toBe('medium');
  });

  it('lists every ingredient the recipe calls for', () => {
    const { entriesOf } = useRecipeCatalog();

    const [entry] = entriesOf([chiliChicken()], 9);

    expect(entry?.ingredientIds).toEqual(expect.arrayContaining(['onion', 'bellPepper']));
  });

  it('keeps only the ingredients actually in season this month', () => {
    const { entriesOf } = useRecipeCatalog();

    // Bell peppers run June to October; onions carry no season on their own.
    const [entry] = entriesOf([chiliChicken()], 9);

    expect(entry?.seasonalIngredientIds).toContain('bellPepper');
    expect(entry?.seasonalIngredientIds).not.toContain('onion');
  });

  it('finds nothing seasonal in the dead of winter', () => {
    const { entriesOf } = useRecipeCatalog();

    const [entry] = entriesOf([chiliChicken()], 1);

    expect(entry?.seasonalIngredientIds).not.toContain('bellPepper');
  });
});
