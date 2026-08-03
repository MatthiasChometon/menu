import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const foodOf = (overrides: Partial<Food>): Food => ({
  id: 'test',
  name: { fr: 'Banane', en: 'Banana' },
  aisle: 'produce',
  icon: 'i-lucide-banana',
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

const useLocale = async (code: 'fr' | 'en'): Promise<void> => {
  await useNuxtApp().$i18n.setLocale(code);
};

describe('useFoodFormat', () => {
  beforeEach(async () => {
    await useLocale('fr');
  });

  afterAll(async () => {
    await useLocale('en');
  });

  describe('quantityLabel', () => {
    it('keeps grams below a kilo', () => {
      const { quantityLabel } = useFoodFormat();

      expect(quantityLabel(foodOf({}), 465)).toBe('465 g');
    });

    it('switches to kilos past a thousand grams', () => {
      const { quantityLabel } = useFoodFormat();

      expect(quantityLabel(foodOf({}), 1720)).toBe('1,72 kg');
    });

    it('writes the decimal separator the English way in English', async () => {
      await useLocale('en');
      const { quantityLabel } = useFoodFormat();

      expect(quantityLabel(foodOf({}), 1720)).toBe('1.72 kg');
    });

    it('uses litres for liquids', () => {
      const { quantityLabel } = useFoodFormat();

      expect(quantityLabel(foodOf({ unit: 'ml' }), 1800)).toBe('1,8 L');
      expect(quantityLabel(foodOf({ unit: 'ml' }), 250)).toBe('250 ml');
    });

    it('rounds to whole units so no weight shows decimals', () => {
      const { quantityLabel } = useFoodFormat();

      expect(quantityLabel(foodOf({}), 89.6)).toBe('90 g');
    });
  });

  describe('pieceLabel', () => {
    const banana = foodOf({
      pieceWeight: 120,
      piece: { fr: 'bananes', en: 'bananas' },
      pieceOne: { fr: 'banane', en: 'banana' },
    });

    it('converts a weight into a countable quantity', () => {
      const { pieceLabel } = useFoodFormat();

      expect(pieceLabel(banana, 1720)).toBe('14 bananes');
    });

    it('uses the singular for a single piece', () => {
      const { pieceLabel } = useFoodFormat();
      const tomatoes = foodOf({
        pieceWeight: 400,
        piece: { fr: 'boîtes', en: 'tins' },
        pieceOne: { fr: 'boîte', en: 'tin' },
      });

      expect(pieceLabel(tomatoes, 200)).toBe('1 boîte');
    });

    it('follows the active language', async () => {
      await useLocale('en');
      const { pieceLabel } = useFoodFormat();

      expect(pieceLabel(banana, 1720)).toBe('14 bananas');
    });

    it('says nothing for a food that is not bought by the unit', () => {
      const { pieceLabel } = useFoodFormat();

      expect(pieceLabel(foodOf({}), 500)).toBeUndefined();
    });
  });

  describe('nameOf', () => {
    it('reads the name in the active language', async () => {
      const { nameOf } = useFoodFormat();
      expect(nameOf(foodOf({}))).toBe('Banane');

      await useLocale('en');
      expect(useFoodFormat().nameOf(foodOf({}))).toBe('Banana');
    });
  });
});
