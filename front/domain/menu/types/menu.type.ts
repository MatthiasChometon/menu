export type LocalizedText = { fr: string; en: string };

export type Aisle = 'butcher' | 'dairy' | 'produce' | 'frozen' | 'grocery' | 'supplement';

export type Unit = 'g' | 'ml';

export type Macros = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
};

export type MicroKey =
  'iron' | 'zinc' | 'magnesium' | 'calcium' | 'potassium' | 'vitaminC' | 'vitaminD' | 'omega3';

export type Micros = Record<MicroKey, number>;

export type MicroHighlight = {
  key: MicroKey;
  amount: number;
  unit: string;
  percentOfTarget: number;
};

export type Food = Macros & {
  id: string;
  micros: Micros;
  name: LocalizedText;
  aisle: Aisle;
  icon: string;
  unit: Unit;
  pricePerKg: number;
  pieceWeight?: number;
  piece?: LocalizedText;
  pieceOne?: LocalizedText;
};

export type RecipeSlot = 'main' | 'breakfast' | 'postWorkout' | 'snack';

// What seasons a dish, as opposed to what it is made of: never weighed, never
// counted in the macros, and never scaled to a profile. Dried spices sit in the
// cupboard; fresh aromatics have to be bought, so only those reach the list.
export type Seasoning = {
  id: string;
  name: LocalizedText;
  icon: string;
  fresh: boolean;
  amount?: LocalizedText;
};

export type Recipe = {
  id: string;
  slot: RecipeSlot;
  name: LocalizedText;
  prepMinutes: number;
  batch: boolean;
  ingredients: Record<string, number>;
  seasonings: string[];
  steps: LocalizedSteps;
};

export type LocalizedSteps = { fr: string[]; en: string[] };

export type MealSlot = 'breakfast' | 'postWorkout' | 'lunch' | 'snack' | 'dinner';

export type DayKey =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type Meal = {
  slot: MealSlot;
  recipe: Recipe;
  quantities: FoodQuantity[];
  macros: Macros;
  portionRatio: number;
};

export type FoodQuantity = {
  food: Food;
  grams: number;
};

export type Day = {
  key: DayKey;
  meals: Meal[];
  macros: Macros;
};

export type MacroTolerance = Partial<Record<keyof Macros, number>> & { default: number };

export type WeekStatus = 'upcoming' | 'current' | 'past';

export type Menu = {
  weekOf: string;
  deliveryAt?: string;
  targets: Macros;
  tolerancePct: MacroTolerance;
  days: Day[];
  recipes: Recipe[];
  shoppingList: ShoppingLine[];
  freshSeasonings: Seasoning[];
  totalPrice: number;
};

export type ShoppingLine = FoodQuantity & {
  price: number;
};

export type ShoppingGroup = {
  aisle: Aisle;
  lines: ShoppingLine[];
  price: number;
};
