import type {
  CustomFoodInput,
  CustomRecipeInput,
  MyCustomFoodsQuery,
  MyCustomRecipesQuery,
} from '#gql';

export type CustomFood = MyCustomFoodsQuery['myCustomFoods'][number];

export type CustomFoodDraft = CustomFoodInput;

export type CustomRecipe = MyCustomRecipesQuery['myCustomRecipes'][number];

export type CustomRecipeDraft = CustomRecipeInput;
