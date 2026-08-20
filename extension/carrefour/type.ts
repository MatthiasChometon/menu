export type CartLine = {
  ean: string;
  title: string;
  /** How many the cart currently holds. */
  counter: number;
  available: boolean;
  outOfStock: boolean;
  price: number;
};

export type Cart = {
  lines: CartLine[];
  /** Products plus delivery fees. Not the price of the groceries. */
  totalAmount: number;
  /** The groceries alone. */
  productsAmount: number;
  /** How many units the basket holds, all lines together. */
  itemCount: number;
  /** What is still missing to reach the next, cheaper delivery band. */
  toNextFeeThreshold?: number;
  /** Whether a slot is held, and for how much longer. */
  slotHeldMinutes?: number;
  /** What is still missing to reach the shop's order minimum. */
  remainedAmount: number;
  deliveryFees: number;
  serviceId: string;
  subBasketType: string;
  slotBooked: boolean;
};

export type SearchHit = {
  ean: string;
  title: string;
  /** As displayed: "the 3 tins of 400g". */
  packaging: string;
};

export type Session = {
  signedIn: boolean;
  name?: string;
};

export type DeliverySlot = {
  ref: string;
  /** Local ISO times, as the shop states them. */
  begin: string;
  end: string;
  /** Latest moment an order for this slot may be placed. */
  cutoff?: string;
  available: boolean;
  selected: boolean;
  feesCents?: number;
};

// What the engine is allowed to ask of the shop. Narrow on purpose: anything
// wider would let the engine reach for the network on its own, and it would
// stop being testable without one.
export type ShopClient = {
  session: () => Promise<Session>;
  cart: () => Promise<Cart>;
  empty: () => Promise<void>;
  /** Sets quantities in one call. Whether counter is absolute is the shop's business. */
  put: (items: { ean: string; counter: number }[]) => Promise<Cart>;
  search: (terms: string) => Promise<SearchHit[]>;
  slots: () => Promise<DeliverySlot[]>;
  bookSlot: (ref: string) => Promise<void>;
};
