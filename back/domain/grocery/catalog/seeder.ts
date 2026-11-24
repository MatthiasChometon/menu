import { Injectable } from '@nestjs/common';
import { GroceryCatalogRepository } from './repository';
import { ObservedProduct } from './type';

type RawEntry = {
  ean: string;
  name: string;
  size: number;
  packagingObserved?: string;
  price?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptional = (value: unknown, type: 'string' | 'number'): boolean =>
  value === undefined || typeof value === type;

// An entry is usable only when it carries what an order needs: a barcode to
// ask the shop for, a name and the size that turns grams into units.
const isRawEntry = (value: unknown): value is RawEntry =>
  isRecord(value) &&
  typeof value.ean === 'string' &&
  typeof value.name === 'string' &&
  typeof value.size === 'number' &&
  isOptional(value.packagingObserved, 'string') &&
  isOptional(value.price, 'number');

const toProduct = (foodId: string, entry: RawEntry): ObservedProduct => ({
  foodId,
  ean: entry.ean,
  name: entry.name,
  size: entry.size,
  packaging: entry.packagingObserved,
  priceCents: entry.price === undefined ? undefined : Math.round(entry.price * 100),
});

// The reference is a file on disk, so nothing about its shape is taken for
// granted: the leading comment string and any incomplete entry are skipped.
export const productsFromReference = (reference: unknown): ObservedProduct[] =>
  isRecord(reference)
    ? Object.entries(reference)
        .filter((entry): entry is [string, RawEntry] => isRawEntry(entry[1]))
        .map(([foodId, entry]): ObservedProduct => toProduct(foodId, entry))
    : [];

@Injectable()
export class GroceryCatalogSeeder {
  constructor(private readonly catalog: GroceryCatalogRepository) {}

  // front/domain/menu/content/carrefour-products.json is the seed, not the live state: it
  // is what the /menu skill reads, and it cannot be written by a browser. Once
  // seeded, runs keep the table current on their own.
  async seed(reference: unknown): Promise<ObservedProduct[]> {
    const products = productsFromReference(reference);
    await this.catalog.record(products);

    return products;
  }
}
