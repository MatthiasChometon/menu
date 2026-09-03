import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CustomRecipeSlot } from './enum';
import { customRecipeConstraints, FOOD_ID } from './utils';

const {
  maxNameLength,
  maxIngredients,
  maxSteps,
  maxStepLength,
  maxGramsPerIngredient,
  maxPrepMinutes,
} = customRecipeConstraints();

@InputType()
export class CustomRecipeIngredientInput {
  @Field(() => String)
  @IsString()
  @Matches(FOOD_ID, { message: 'foodId must be a plain food identifier.' })
  foodId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(maxGramsPerIngredient)
  grams!: number;
}

@InputType({ description: 'A recipe to keep alongside the site catalogue.' })
export class CustomRecipeInput {
  // Trimmed before it is judged: a name of three spaces is not a name, and
  // class-validator's emptiness check would let it through untouched.
  @Field()
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(maxNameLength)
  name!: string;

  @Field(() => CustomRecipeSlot)
  @IsEnum(CustomRecipeSlot)
  slot!: CustomRecipeSlot;

  @Field(() => [CustomRecipeIngredientInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(maxIngredients)
  @ValidateNested({ each: true })
  @Type(() => CustomRecipeIngredientInput)
  ingredients!: CustomRecipeIngredientInput[];

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(maxSteps)
  @IsString({ each: true })
  @MaxLength(maxStepLength, { each: true })
  steps!: string[];

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(maxPrepMinutes)
  prepMinutes!: number;

  @Field(() => Boolean)
  @IsBoolean()
  batch!: boolean;
}

@InputType()
export class UpdateCustomRecipeInput extends CustomRecipeInput {
  @Field(() => ID)
  @IsUUID()
  id!: string;
}
