import foodData from '~~/content/foods.json';

type RawFood = Macros & {
  name: LocalizedText;
  aisle: string;
  icon: string;
  unit?: string;
  pricePerKg: number;
  pieceWeight?: number;
  piece?: LocalizedText;
  pieceOne?: LocalizedText;
};

const AISLE_LIST: readonly Aisle[] = [
  'butcher',
  'dairy',
  'produce',
  'frozen',
  'grocery',
  'supplement',
];

const rawFoods: Record<string, RawFood> = foodData;

const toAisle = (value: string): Aisle => AISLE_LIST.find((aisle) => aisle === value) ?? 'grocery';

const toUnit = (value: string | undefined): Unit => (value === 'ml' ? 'ml' : 'g');

const catalog: Record<string, Food> = Object.fromEntries(
  Object.entries(rawFoods).map(([id, raw]): [string, Food] => [
    id,
    {
      id,
      name: raw.name,
      aisle: toAisle(raw.aisle),
      icon: raw.icon,
      unit: toUnit(raw.unit),
      kcal: raw.kcal,
      protein: raw.protein,
      fat: raw.fat,
      carbs: raw.carbs,
      fiber: raw.fiber,
      pricePerKg: raw.pricePerKg,
      pieceWeight: raw.pieceWeight,
      piece: raw.piece,
      pieceOne: raw.pieceOne,
    },
  ]),
);

export const useFoods = (): {
  foods: Record<string, Food>;
  foodOf: (id: string) => Food | undefined;
  aisleOrder: readonly Aisle[];
  imageOf: (food: Food) => string | undefined;
} => {
  const { foodImage } = useImages();

  return {
    foods: catalog,
    foodOf: (id: string): Food | undefined => catalog[id],
    aisleOrder: AISLE_LIST,
    imageOf: (food: Food): string | undefined => foodImage(food.id),
  };
};
