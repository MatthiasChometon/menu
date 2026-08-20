import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { GroceryJobEventKind, GroceryJobOutcome } from '../enum';
import { jobConstraints } from './utils';

@InputType({ description: 'What a run reports as it works.' })
export class GroceryJobEventInput {
  @Field(() => GroceryJobEventKind)
  @IsEnum(GroceryJobEventKind)
  kind!: GroceryJobEventKind;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(jobConstraints().foodIdMaxLength)
  foodId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(jobConstraints().labelMaxLength)
  label?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(jobConstraints().detailMaxLength)
  detail?: string;
}

@InputType({ description: 'How much of one food the week calls for.' })
export class FoodNeedInput {
  @Field()
  @IsString()
  @MaxLength(jobConstraints().foodIdMaxLength)
  foodId!: string;

  @Field(() => Int, { description: 'Grams or millilitres over the whole week.' })
  @IsInt()
  @Min(0)
  grams!: number;

  @Field({ nullable: true, description: 'How the menu names this food.' })
  @IsOptional()
  @IsString()
  @MaxLength(jobConstraints().labelMaxLength)
  label?: string;
}

@InputType({ description: 'Asks for the basket of a week to be filled.' })
export class CreateGroceryJobInput {
  @Field({ description: 'Monday of the week to order, as YYYY-MM-DD.' })
  @IsISO8601()
  weekOf!: string;

  // Worked out by the site, which holds the menu prerendered; the server turns
  // it into products and counts.
  @Field(() => [FoodNeedInput])
  @ValidateNested({ each: true })
  @ArrayMaxSize(jobConstraints().maxNeedsPerJob)
  @Type(() => FoodNeedInput)
  needs!: FoodNeedInput[];
}

@InputType({ description: 'A product a run actually put in the basket.' })
export class GroceryObservationInput {
  @Field()
  @IsString()
  @MaxLength(jobConstraints().foodIdMaxLength)
  foodId!: string;

  @Field()
  @IsString()
  @MaxLength(jobConstraints().eanMaxLength)
  ean!: string;

  @Field()
  @IsString()
  @MaxLength(jobConstraints().labelMaxLength)
  name!: string;

  @Field(() => Int, { description: 'What one unit cost, in cents.' })
  @IsInt()
  @Min(0)
  priceCents!: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Content of one unit. Only a substitute knows it; a known product keeps its own.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  size?: number;
}

@InputType({ description: 'What a run found once it was done.' })
export class GroceryJobOutcomeInput {
  @Field(() => GroceryJobOutcome)
  @IsEnum(GroceryJobOutcome)
  outcome!: GroceryJobOutcome;

  @Field(() => Int, { nullable: true, description: 'Groceries only, in cents.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  productsCents?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFeesCents?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Still missing to reach the shop order minimum. Above zero, it cannot be ordered.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  shortOfMinimumCents?: number;

  // What never made it into the basket. It must not be counted into the
  // cupboard, or the next order would skip buying it again.
  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(jobConstraints().maxNeedsPerJob)
  missingFoodIds!: string[];

  // What the shop charged and, for a substitute, what it holds. This is what
  // keeps the reference from drifting further from the shelves every month.
  @Field(() => [GroceryObservationInput], { defaultValue: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(jobConstraints().maxNeedsPerJob)
  @Type(() => GroceryObservationInput)
  observations!: GroceryObservationInput[];
}
