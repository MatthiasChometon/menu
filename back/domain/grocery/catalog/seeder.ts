import { Injectable } from '@nestjs/common';
import { GroceryCatalogRepository } from './repository';
import { ObservedProduct, ReferenceEntry } from './type';

@Injectable()
export class GroceryCatalogSeeder {
  constructor(private readonly catalog: GroceryCatalogRepository) {}

  // front/content/carrefour-products.json is the seed, not the live state: it
  // is what the /menu skill reads, and it cannot be written by a browser. Once
  // seeded, runs keep the table current on their own.
  async seed(reference: Record<string, ReferenceEntry | string>): Promise<ObservedProduct[]> {
    const products = this.readable(reference);
    await this.catalog.record(products);

    return products;
  }

  private readable(reference: Record<string, ReferenceEntry | string>): ObservedProduct[] {
    return Object.entries(reference)
      .map(([foodId, entry]): ObservedProduct | undefined => {
        // The file carries a leading comment string alongside the products.
        if (typeof entry === 'string') {
          return undefined;
        }

        if (entry.ean === undefined || entry.name === undefined || entry.size === undefined) {
          return undefined;
        }

        return {
          foodId,
          ean: entry.ean,
          name: entry.name,
          size: entry.size,
          packaging: entry.packagingObserved,
          priceCents: entry.price === undefined ? undefined : Math.round(entry.price * 100),
        };
      })
      .filter((product): product is ObservedProduct => product !== undefined);
  }
}
