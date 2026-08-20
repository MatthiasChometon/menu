import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { KnownProduct } from '../basket/type';
import { groceryProduct } from './schema';
import { ObservedProduct, PriceSighting } from './type';

@Injectable()
export class GroceryCatalogRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async knownProducts(): Promise<Map<string, KnownProduct>> {
    const records = await this.database
      .select({
        foodId: groceryProduct.foodId,
        ean: groceryProduct.ean,
        name: groceryProduct.name,
        size: groceryProduct.size,
      })
      .from(groceryProduct);

    return new Map(records.map((record): [string, KnownProduct] => [record.foodId, record]));
  }

  // A price seen on a product already on file. The size is deliberately left
  // alone: the cart states what a line cost, never what a unit holds, and
  // overwriting a known size with nothing would break every count afterwards.
  async recordPrices(sightings: PriceSighting[]): Promise<void> {
    if (sightings.length === 0) {
      return;
    }

    await Promise.all(
      sightings.map((sighting) =>
        this.database
          .update(groceryProduct)
          .set({ name: sighting.name, priceCents: sighting.priceCents, observedAt: new Date() })
          .where(
            and(eq(groceryProduct.foodId, sighting.foodId), eq(groceryProduct.ean, sighting.ean)),
          ),
      ),
    );
  }

  // One statement rather than one per product: a run reports the whole basket
  // at once, and the reference is small enough that rewriting a row that has
  // not moved costs nothing.
  async record(products: ObservedProduct[]): Promise<void> {
    if (products.length === 0) {
      return;
    }

    await this.database
      .insert(groceryProduct)
      .values(
        products.map((product) => ({
          foodId: product.foodId,
          ean: product.ean,
          name: product.name,
          size: product.size,
          packaging: product.packaging ?? null,
          priceCents: product.priceCents ?? null,
          observedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: groceryProduct.foodId,
        set: {
          ean: sql`excluded.ean`,
          name: sql`excluded.name`,
          size: sql`excluded.size`,
          packaging: sql`excluded.packaging`,
          priceCents: sql`excluded.price_cents`,
          observedAt: sql`excluded.observed_at`,
        },
      });
  }
}
