export type PlannedLine = {
  foodId: string;
  /** How the menu names this food, for when no product is on file yet. */
  label?: string;
  grams: number;
  fromPantry: number;
  ean?: string;
  productName?: string;
  unitSize?: number;
  units?: number;
};

export type ReportedEvent = {
  kind:
    | 'STARTED'
    | 'CART_EMPTIED'
    | 'LINE_ADDED'
    | 'LINE_SUBSTITUTED'
    | 'LINE_MISSING'
    | 'SLOT_BOOKED'
    | 'SLOT_UNAVAILABLE'
    | 'FINISHED'
    | 'BLOCKED';
  foodId?: string;
  label?: string;
  detail?: string;
};

export type Outcome = 'SUCCEEDED' | 'FAILED' | 'BLOCKED';

export type FillResult = {
  outcome: Outcome;
  /** What the basket holds at the end, in euros, products only. */
  productsAmount: number;
  deliveryFees: number;
  /** Still missing to reach the shop's order minimum. Above zero, it cannot be ordered. */
  shortOfMinimum: number;
  missing: string[];
};
