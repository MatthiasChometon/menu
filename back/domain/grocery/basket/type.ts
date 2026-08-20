export type FoodNeed = {
  foodId: string;
  grams: number;
};

export type KnownProduct = {
  ean: string;
  name: string;
  /** Usable content of one unit, in grams or millilitres. */
  size: number;
};

export type BasketLine = {
  foodId: string;
  /** Grams the menu calls for, before the pantry is taken off. */
  grams: number;
  /** Grams already at home, which is why fewer units may be needed. */
  fromPantry: number;
  product?: KnownProduct;
  /** How many of that product to put in the basket. Absent when no product is known yet. */
  units?: number;
};
