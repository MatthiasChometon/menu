import { Injectable } from '@nestjs/common';
import { DatabaseExecutor } from '../../../infrastructure/database/token';
import { GroceryCatalogRepository } from './repository';
import { ObservedProduct, ObservedSighting } from './type';

type SizedSighting = ObservedSighting & { size: number };

@Injectable()
export class CatalogAbsorber {
  constructor(private readonly catalog: GroceryCatalogRepository) {}

  // A substitute states what a unit holds, so it becomes the product of
  // reference outright. A product already on file only ever hands back a
  // price: the cart says what a line cost, never what a unit contains.
  async absorb(observations: ObservedSighting[], executor: DatabaseExecutor): Promise<void> {
    const withSize = observations.filter((seen): seen is SizedSighting => seen.size !== undefined);
    const priceOnly = observations.filter((seen): boolean => seen.size === undefined);

    // In this order: a price update looks the product up by the ean the
    // substitute may be about to replace.
    await this.catalog.record(this.lastWordPerFood(withSize).map(this.toProduct), executor);
    await this.catalog.recordPrices(priceOnly, executor);
  }

  // One statement upserts the whole list, and Postgres refuses to touch the
  // same row twice in one statement: a food reported twice keeps its last word.
  private lastWordPerFood(sightings: SizedSighting[]): SizedSighting[] {
    return [
      ...new Map(sightings.map((seen): [string, SizedSighting] => [seen.foodId, seen])).values(),
    ];
  }

  private readonly toProduct = (seen: SizedSighting): ObservedProduct => ({
    foodId: seen.foodId,
    ean: seen.ean,
    name: seen.name,
    size: seen.size,
    priceCents: seen.priceCents,
  });
}
