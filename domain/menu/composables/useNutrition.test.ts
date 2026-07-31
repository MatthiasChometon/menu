import { describe, expect, it } from 'vitest';

const gramsOf = (overrides: Partial<Food>): Food => ({
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
  },
  ...overrides,
});

describe('useNutrition', () => {
  describe('macrosOfQuantities', () => {
    it('scales a food down to the weight actually eaten', () => {
      const { macrosOfQuantities } = useNutrition();
      const oats = gramsOf({ protein: 13, fat: 7, carbs: 60, fiber: 10 });

      const macros = macrosOfQuantities([{ food: oats, grams: 50 }]);

      expect(macros.protein).toBeCloseTo(6.5);
      expect(macros.fat).toBeCloseTo(3.5);
      expect(macros.carbs).toBeCloseTo(30);
      expect(macros.fiber).toBeCloseTo(5);
    });

    it('derives energy from the macros so a total matches its target', () => {
      const { macrosOfQuantities } = useNutrition();
      const food = gramsOf({ protein: 10, fat: 10, carbs: 10 });

      const macros = macrosOfQuantities([{ food, grams: 100 }]);

      expect(macros.kcal).toBeCloseTo(10 * 4 + 10 * 9 + 10 * 4);
    });

    it('adds up every food of a meal', () => {
      const { macrosOfQuantities } = useNutrition();
      const chicken = gramsOf({ protein: 23 });
      const rice = gramsOf({ carbs: 72 });

      const macros = macrosOfQuantities([
        { food: chicken, grams: 100 },
        { food: rice, grams: 100 },
      ]);

      expect(macros.protein).toBeCloseTo(23);
      expect(macros.carbs).toBeCloseTo(72);
    });

    it('returns zeros for an empty meal', () => {
      const { macrosOfQuantities } = useNutrition();

      expect(macrosOfQuantities([])).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });
    });
  });

  describe('priceOfQuantities', () => {
    it('prices a quantity from its cost per kilo', () => {
      const { priceOfQuantities } = useNutrition();
      const salmon = gramsOf({ pricePerKg: 22 });

      expect(priceOfQuantities([{ food: salmon, grams: 240 }])).toBeCloseTo(5.28);
    });
  });

  describe('sumMacros', () => {
    it('adds meals into a day total', () => {
      const { sumMacros } = useNutrition();

      const total = sumMacros([
        { kcal: 900, protein: 45, fat: 30, carbs: 105, fiber: 15 },
        { kcal: 400, protein: 25, fat: 6, carbs: 55, fiber: 3 },
      ]);

      expect(total).toEqual({ kcal: 1300, protein: 70, fat: 36, carbs: 160, fiber: 18 });
    });
  });
});
