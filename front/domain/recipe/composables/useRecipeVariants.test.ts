import { describe, expect, it } from 'vitest';

const chiliVariants = (): RecipeVariant[] => {
  const { latestMenu } = useMenu();
  const { variantsOf } = useRecipeVariants();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return variantsOf(latestMenu, 'chiliChicken');
};

describe('useRecipeVariants', () => {
  it('counts every serving of the week, reduced portions included', () => {
    const { portionsOf } = useRecipeVariants();
    const variants = chiliVariants();

    const servings = variants.flatMap((variant): unknown[] => variant.servings);

    expect(portionsOf(variants)).toBe(servings.length);
  });

  it('multiplies each portion by the number of times it is served', () => {
    const { weekQuantitiesOf } = useRecipeVariants();
    const variants = chiliVariants();

    const rice = weekQuantitiesOf(variants).find(({ food }): boolean => food.id === 'brownRice');
    const expected = variants.reduce(
      (total, variant): number =>
        total +
        (variant.quantities.find(({ food }): boolean => food.id === 'brownRice')?.grams ?? 0) *
          variant.servings.length,
      0,
    );

    expect(rice?.grams).toBeCloseTo(expected);
  });

  it('lists a food once however many portions use it', () => {
    const { weekQuantitiesOf } = useRecipeVariants();

    const ids = weekQuantitiesOf(chiliVariants()).map(({ food }): string => food.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cooks more for the week than for a single portion', () => {
    const { weekQuantitiesOf } = useRecipeVariants();
    const variants = chiliVariants();

    const weekRice = weekQuantitiesOf(variants).find(
      ({ food }): boolean => food.id === 'brownRice',
    );
    const oneRice = variants[0]?.quantities.find(({ food }): boolean => food.id === 'brownRice');

    expect(weekRice?.grams).toBeGreaterThan(oneRice?.grams ?? 0);
  });
});
