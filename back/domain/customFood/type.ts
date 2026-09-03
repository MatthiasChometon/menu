export type CustomFoodRecord = {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  pricePerKg: number;
};

export type CustomFoodDraft = Omit<CustomFoodRecord, 'id'>;
