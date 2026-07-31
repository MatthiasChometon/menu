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

export type Food = Macros & {
  id: string;
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

export type Recipe = {
  id: string;
  slot: RecipeSlot;
  name: LocalizedText;
  prepMinutes: number;
  batch: boolean;
  ingredients: Record<string, number>;
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

export type Menu = {
  weekOf: string;
  targets: Macros;
  tolerancePct: MacroTolerance;
  days: Day[];
  recipes: Recipe[];
  shoppingList: ShoppingLine[];
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
