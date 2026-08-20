import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroceryCatalogRepository } from './repository';
import { GroceryCatalogSeeder } from './seeder';
import { ObservedProduct } from './type';

let recorded: ObservedProduct[];
let seeder: GroceryCatalogSeeder;

beforeEach((): void => {
  recorded = [];
  const catalog = {
    record: vi.fn((products: ObservedProduct[]): Promise<void> => {
      recorded = products;
      return Promise.resolve();
    }),
  };
  seeder = new GroceryCatalogSeeder(catalog as unknown as GroceryCatalogRepository);
});

describe('reading the product reference', () => {
  it('keeps the barcode, the size and the price in cents', async () => {
    await seeder.seed({
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

  it('skips the comment the file carries alongside the products', async () => {
    await seeder.seed({
      _comment: 'Produits Carrefour retenus pour le menu.',
      brownRice: { name: 'Rice', ean: '3560070510771', size: 500 },
    });

    expect(recorded.map((product): string => product.foodId)).toEqual(['brownRice']);
  });

  it('leaves out an entry that has no barcode to order with', async () => {
    await seeder.seed({
      tofu: { name: 'Tofu', size: 200 },
      brownRice: { name: 'Rice', ean: '3560070510771', size: 500 },
    });

    expect(recorded.map((product): string => product.foodId)).toEqual(['brownRice']);
  });

  it('rounds a price that does not divide into whole cents', async () => {
    await seeder.seed({
      milk: { name: 'Milk', ean: '3270190207443', size: 1000, price: 1.345 },
    });

    expect(recorded[0].priceCents).toBe(135);
  });
});
