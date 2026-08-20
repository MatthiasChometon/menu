import { KnownProduct } from '../basket/type';

export type ObservedProduct = KnownProduct & {
  foodId: string;
  /** What the shop displays, kept verbatim: "the 3 tins of 400g". */
  packaging?: string;
  priceCents?: number;
};
