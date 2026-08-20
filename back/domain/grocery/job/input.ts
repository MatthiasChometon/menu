import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
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

@InputType({ description: 'Asks for the basket of a week to be filled.' })
export class CreateGroceryJobInput {
  @Field({ description: 'Monday of the week to order, as YYYY-MM-DD.' })
  @IsISO8601()
  weekOf!: string;
}
