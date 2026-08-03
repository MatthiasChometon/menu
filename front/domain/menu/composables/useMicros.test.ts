import { describe, expect, it } from 'vitest';

const foodWith = (micros: Partial<Micros>): Food => ({
  id: 'test',
  name: { fr: 'Test', en: 'Test' },
  aisle: 'grocery',
  icon: 'i-lucide-wheat',
  unit: 'g',
  kcal: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  pricePerKg: 0,
  micros: {
    iron: 0,
    zinc: 0,
    magnesium: 0,
    calcium: 0,
    potassium: 0,
    vitaminC: 0,
    vitaminD: 0,
    omega3: 0,
    ...micros,
  },
});

describe('useMicros', () => {
  it('scales a nutrient down to the weight actually eaten', () => {
    const { microsOfQuantities } = useMicros();
    const beef = foodWith({ iron: 2.6, zinc: 4.8 });

    const micros = microsOfQuantities([{ food: beef, grams: 150 }]);

    expect(micros.iron).toBeCloseTo(3.9);
    expect(micros.zinc).toBeCloseTo(7.2);
  });

  it('adds up every food of a meal', () => {
    const { microsOfQuantities } = useMicros();

    const micros = microsOfQuantities([
      { food: foodWith({ magnesium: 138 }), grams: 100 },
      { food: foodWith({ magnesium: 270 }), grams: 50 },
    ]);

    expect(micros.magnesium).toBeCloseTo(273);
  });

  it('only highlights what meaningfully moves the daily target', () => {
    const { microsOfQuantities, highlightsOf } = useMicros();
    // 2.2 g of EPA+DHA per 100 g: a salmon fillet covers the day on its own,
    // while a trace of vitamin C should stay out of the list.
    const salmon = foodWith({ omega3: 2.2, vitaminC: 0.5 });

    const highlights = highlightsOf(microsOfQuantities([{ food: salmon, grams: 120 }]));

    expect(highlights.map((highlight): MicroKey => highlight.key)).toEqual(['omega3']);
  });

  it('ranks the strongest contribution first', () => {
    const { microsOfQuantities, highlightsOf } = useMicros();
    const food = foodWith({ iron: 12, magnesium: 500, omega3: 2 });

    const percents = highlightsOf(microsOfQuantities([{ food, grams: 100 }])).map(
      (highlight): number => highlight.percentOfTarget,
    );

    expect([...percents].sort((left, right): number => right - left)).toEqual(percents);
  });

  it('expresses a contribution as a share of the daily target', () => {
    const { microsOfQuantities, highlightsOf } = useMicros();
    const food = foodWith({ iron: 11 });

    const [iron] = highlightsOf(microsOfQuantities([{ food, grams: 100 }]));

    expect(iron?.percentOfTarget).toBeCloseTo(100);
    expect(iron?.unit).toBe('mg');
  });

  it('says nothing when a portion carries no standout nutrient', () => {
    const { microsOfQuantities, highlightsOf } = useMicros();

    const highlights = highlightsOf(microsOfQuantities([{ food: foodWith({}), grams: 200 }]));

    expect(highlights).toEqual([]);
  });
});
