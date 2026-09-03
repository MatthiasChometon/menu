import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { customFoodConstraints } from './utils';

const { maxNameLength, maxKcal, maxMacro, maxPricePerKg } = customFoodConstraints();

@InputType({ description: 'A food to keep alongside the site catalogue, macros per 100 g.' })
export class CustomFoodInput {
  // Trimmed before it is judged: a name of three spaces is not a name, and
  // class-validator's emptiness check would let it through untouched.
  @Field()
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(maxNameLength)
  name!: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(maxKcal)
  kcal!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(maxMacro)
  protein!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(maxMacro)
  fat!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(maxMacro)
  carbs!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(maxMacro)
  fiber!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(maxPricePerKg)
  pricePerKg!: number;
}

@InputType()
export class UpdateCustomFoodInput extends CustomFoodInput {
  @Field(() => ID)
  @IsUUID()
  id!: string;
}
