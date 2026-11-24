import { describe, expect, it } from 'vitest';
import { productsFromReference } from './seeder';

describe('reading the product reference', () => {
  it('keeps the barcode, the size and the price in cents', () => {
    const recorded = productsFromReference({
      brownRice: {
        name: "Riz Complet CARREFOUR CLASSIC'",
        ean: '3560070510771',
        size: 500,
        packagingObserved: 'la boite de 500g',
        price: 1.79,
      },
    });

    expect(recorded).toEqual([
      {
        foodId: 'brownRice',
        ean: '3560070510771',
        name: "Riz Complet CARREFOUR CLASSIC'",
        size: 500,
        packaging: 'la boite de 500g',
        priceCents: 179,
      },
    ]);
  });

  it('skips the comment the file carries alongside the products', () => {
    const recorded = productsFromReference({
      _comment: 'Produits Carrefour retenus pour le menu.',
      brownRice: { name: 'Rice', ean: '3560070510771', size: 500 },
    });

    expect(recorded.map((product): string => product.foodId)).toEqual(['brownRice']);
  });

  it('leaves out an entry that has no barcode to order with', () => {
    const recorded = productsFromReference({
      tofu: { name: 'Tofu', size: 200 },
      brownRice: { name: 'Rice', ean: '3560070510771', size: 500 },
    });

    expect(recorded.map((product): string => product.foodId)).toEqual(['brownRice']);
  });

  it('rounds a price that does not divide into whole cents', () => {
    const recorded = productsFromReference({
      milk: { name: 'Milk', ean: '3270190207443', size: 1000, price: 1.345 },
    });

    expect(recorded[0]?.priceCents).toBe(135);
  });

  it('reads nothing from a file that is not a list of products', () => {
    expect(productsFromReference('not an object')).toEqual([]);
    expect(productsFromReference(null)).toEqual([]);
  });

  it('leaves out an entry whose size is not a number', () => {
    const recorded = productsFromReference({
      rice: { name: 'Rice', ean: '3560070510771', size: '500' },
    });

    expect(recorded).toEqual([]);
  });
});
