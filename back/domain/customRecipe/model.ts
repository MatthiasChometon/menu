import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { CustomRecipeSlot } from './enum';

@ObjectType({ description: 'How much of one food a custom recipe calls for.' })
export class CustomRecipeIngredient {
  @Field(() => String, { description: 'Either a site food id or another custom food’s id.' })
  foodId!: string;

  @Field(() => Int)
  grams!: number;
}

@ObjectType({ description: 'A recipe its owner wrote for themselves.' })
export class CustomRecipe {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => CustomRecipeSlot)
  slot!: CustomRecipeSlot;

  @Field(() => [CustomRecipeIngredient])
  ingredients!: CustomRecipeIngredient[];

  @Field(() => [String])
  steps!: string[];

  @Field(() => Int)
  prepMinutes!: number;

  @Field(() => Boolean, { description: 'Whether it is worth cooking a double batch of.' })
  batch!: boolean;
}
