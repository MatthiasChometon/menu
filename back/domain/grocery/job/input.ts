import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { GroceryJobEventKind } from '../enum';
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
