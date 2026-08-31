import type {
  Aisle,
  Food,
  LocalizedText,
  LocalizedSteps,
  Macros,
  Micros,
  Recipe,
  RecipeSlot,
  Seasoning,
  Unit,
} from '../types/menu.type';

type RawFood = Macros & {
  name: LocalizedText;
  aisle: string;
  icon: string;
  unit?: string;
  pricePerKg: number;
  pieceWeight?: number;
  piece?: LocalizedText;
  pieceOne?: LocalizedText;
  micros?: Partial<Micros>;
};

type RawRecipe = {
  slot: string;
  name: LocalizedText;
  prepMinutes: number;
  batch: boolean;
  ingredients: Record<string, number>;
  seasonings?: string[];
  steps: LocalizedSteps;
};

type RawSeasoning = { name: LocalizedText; icon: string; fresh?: boolean; amount?: LocalizedText };

export const aisleOrder: readonly Aisle[] = [
  'butcher',
  'dairy',
  'produce',
  'frozen',
  'grocery',
  'supplement',
];

const recipeSlots: readonly RecipeSlot[] = ['main', 'breakfast', 'postWorkout', 'snack'];

const toMicros = (raw: Partial<Micros> | undefined): Micros => ({
  iron: raw?.iron ?? 0,
  zinc: raw?.zinc ?? 0,
  magnesium: raw?.magnesium ?? 0,
  calcium: raw?.calcium ?? 0,
  potassium: raw?.potassium ?? 0,
  vitaminC: raw?.vitaminC ?? 0,
  vitaminD: raw?.vitaminD ?? 0,
  omega3: raw?.omega3 ?? 0,
});

const toAisle = (value: string): Aisle => aisleOrder.find((aisle): boolean => aisle === value) ?? 'grocery';

const toUnit = (value: string | undefined): Unit => (value === 'ml' ? 'ml' : 'g');

const toSlot = (value: string): RecipeSlot =>
  recipeSlots.find((slot): boolean => slot === value) ?? 'main';

const index = <Raw, Value>(
  raw: Record<string, Raw>,
  build: (id: string, value: Raw) => Value,
): Record<string, Value> =>
  Object.fromEntries(Object.entries(raw).map(([id, value]): [string, Value] => [id, build(id, value)]));

export const buildFoodCatalog = (raw: Record<string, RawFood>): Record<string, Food> =>
  index(raw, (id, food): Food => ({
    id,
    name: food.name,
    aisle: toAisle(food.aisle),
    icon: food.icon,
    unit: toUnit(food.unit),
    kcal: food.kcal,
    protein: food.protein,
    fat: food.fat,
    carbs: food.carbs,
    fiber: food.fiber,
    micros: toMicros(food.micros),
    pricePerKg: food.pricePerKg,
    pieceWeight: food.pieceWeight,
    piece: food.piece,
    pieceOne: food.pieceOne,
  }));

export const buildRecipeCatalog = (raw: Record<string, RawRecipe>): Record<string, Recipe> =>
  index(raw, (id, recipe): Recipe => ({
    id,
    slot: toSlot(recipe.slot),
    name: recipe.name,
    prepMinutes: recipe.prepMinutes,
    batch: recipe.batch,
    ingredients: recipe.ingredients,
    seasonings: recipe.seasonings ?? [],
    steps: recipe.steps,
  }));

export const buildSeasoningCatalog = (raw: Record<string, RawSeasoning>): Record<string, Seasoning> =>
  index(raw, (id, seasoning): Seasoning => ({
    id,
    name: seasoning.name,
    icon: seasoning.icon,
    fresh: seasoning.fresh === true,
    amount: seasoning.amount,
  }));

// What has to be bought for the week: the same head of garlic serves every recipe
// that calls for it, so each fresh aromatic appears once.
export const freshSeasonings = (
  recipes: Recipe[],
  catalog: Record<string, Seasoning>,
): Seasoning[] => {
  const ids = [...new Set(recipes.flatMap((recipe): string[] => recipe.seasonings))];
  return ids
    .map((id): Seasoning | undefined => catalog[id])
    .filter((seasoning): seasoning is Seasoning => seasoning !== undefined && seasoning.fresh);
};
