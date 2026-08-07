import { describe, expect, it } from 'vitest';

describe('useRecipeSteps', () => {
  it('splits a step into its plain text and its ingredient mentions', () => {
    const { segmentsOf } = useRecipeSteps();

    const segments = segmentsOf("Émincer {l'oignon|onion} et le poivron.");

    expect(segments).toEqual([
      { text: 'Émincer ' },
      { text: "l'oignon", foodId: 'onion' },
      { text: ' et le poivron.' },
    ]);
  });

  it('keeps a step without any mention in one piece', () => {
    const { segmentsOf } = useRecipeSteps();

    expect(segmentsOf('Laisser mijoter 20 min.')).toEqual([{ text: 'Laisser mijoter 20 min.' }]);
  });

  it('reads a step that opens and closes on a mention', () => {
    const { segmentsOf } = useRecipeSteps();

    expect(segmentsOf('{le riz|brownRice}')).toEqual([{ text: 'le riz', foodId: 'brownRice' }]);
  });

  it('reads the sentence a human would read, markup removed', () => {
    const { plainTextOf } = useRecipeSteps();

    expect(plainTextOf('Verser {les tomates concassées|crushedTomatoes} et remuer.')).toBe(
      'Verser les tomates concassées et remuer.',
    );
  });

  it('mentions only what the recipe actually lists, ingredient or seasoning', () => {
    const { recipes } = useRecipes();
    const { segmentsOf } = useRecipeSteps();
    const { stepsOf } = useFoodFormat();

    for (const recipe of Object.values(recipes)) {
      const allowed = [...Object.keys(recipe.ingredients), ...recipe.seasonings];
      const mentioned = stepsOf(recipe)
        .flatMap((step): StepSegment[] => segmentsOf(step))
        .flatMap((segment): string[] => (segment.foodId === undefined ? [] : [segment.foodId]));

      for (const id of mentioned) {
        expect(allowed, `${recipe.id} mentions ${id}`).toContain(id);
      }
    }
  });

  it('names every seasoning in the steps, so none is discovered mid-cooking', () => {
    const { recipes } = useRecipes();
    const { segmentsOf } = useRecipeSteps();
    const { stepsOf } = useFoodFormat();

    for (const recipe of Object.values(recipes)) {
      const mentioned = new Set(
        stepsOf(recipe)
          .flatMap((step): StepSegment[] => segmentsOf(step))
          .map((segment): string | undefined => segment.foodId),
      );

      for (const id of recipe.seasonings) {
        expect(mentioned, `${recipe.id} never mentions ${id}`).toContain(id);
      }
    }
  });

  it('names every ingredient somewhere in the steps, so none is weighed blind', () => {
    const { recipes } = useRecipes();
    const { segmentsOf } = useRecipeSteps();
    const { stepsOf } = useFoodFormat();

    for (const recipe of Object.values(recipes)) {
      const mentioned = new Set(
        stepsOf(recipe)
          .flatMap((step): StepSegment[] => segmentsOf(step))
          .map((segment): string | undefined => segment.foodId),
      );

      for (const foodId of Object.keys(recipe.ingredients)) {
        expect(mentioned, `${recipe.id} never mentions ${foodId}`).toContain(foodId);
      }
    }
  });
});
