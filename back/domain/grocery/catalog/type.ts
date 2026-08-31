import { KnownProduct } from '../basket/type';

export type ObservedProduct = KnownProduct & {
  foodId: string;
  /** What the shop displays, kept verbatim: "the 3 tins of 400g". */
  packaging?: string;
  priceCents?: number;
};

/** What a run saw of a product it actually put in the basket. */
export type PriceSighting = {
  foodId: string;
  ean: string;
  name: string;
  priceCents: number;
};

/** One entry of front/domain/menu/content/carrefour-products.json, which seeds the table. */
export type ReferenceEntry = {
  name?: string;
  ean?: string;
  size?: number;
  packagingObserved?: string;
  price?: number;
};
