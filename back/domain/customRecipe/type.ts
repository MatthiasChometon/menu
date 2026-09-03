import { CustomRecipeSlot } from './enum';

export type CustomRecipeIngredient = {
  foodId: string;
  grams: number;
};

export type CustomRecipeRecord = {
  id: string;
  name: string;
  slot: CustomRecipeSlot;
  ingredients: CustomRecipeIngredient[];
  steps: string[];
  prepMinutes: number;
  batch: boolean;
};

export type CustomRecipeDraft = Omit<CustomRecipeRecord, 'id'>;
