import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PlannedDayKey, PlannedMealSlot } from './enum';

// The API cannot check that a recipe exists: the catalogue is site content, not
// a table, and a chosen dish may equally be a signed-in reader's own recipe,
// which is a UUID rather than a plain word. It can still refuse anything that
// is not shaped like either, which is what keeps junk out of the column.
const RECIPE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

@InputType()
export class PlannedMealInput {
  @Field(() => PlannedMealSlot)
  @IsEnum(PlannedMealSlot)
  slot!: PlannedMealSlot;

  @Field(() => String)
  @IsString()
  @Matches(RECIPE_ID, { message: 'recipeId must be a plain recipe identifier.' })
  recipeId!: string;
}

@InputType()
export class PlannedDayInput {
  @Field(() => PlannedDayKey)
  @IsEnum(PlannedDayKey)
  day!: PlannedDayKey;

  @Field(() => [PlannedMealInput])
  @IsArray()
  // Five meals a day; more means the caller is inventing slots.
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PlannedMealInput)
  meals!: PlannedMealInput[];
}

@InputType()
export class WeekPlanInput {
  @Field(() => String)
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'weekOf must be a YYYY-MM-DD date.' })
  weekOf!: string;

  @Field(() => [PlannedDayInput])
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => PlannedDayInput)
  days!: PlannedDayInput[];
}
