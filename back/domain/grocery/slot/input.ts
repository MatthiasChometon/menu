import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, Max, Min, ValidateNested } from 'class-validator';
import { slotConstraints } from './utils';

@InputType()
export class GrocerySlotWindowInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(7)
  weekday!: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(slotConstraints().minutesInADay)
  startMinute!: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(slotConstraints().minutesInADay)
  endMinute!: number;
}

// Wrapped rather than passed as a bare list argument: the validation pipe walks
// into a nested input, and does not walk into the elements of an argument
// array — weekday 9 sailed straight through until a test said so.
@InputType()
export class GrocerySlotWindowsInput {
  @Field(() => [GrocerySlotWindowInput])
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(slotConstraints().maxWindows)
  @Type(() => GrocerySlotWindowInput)
  windows!: GrocerySlotWindowInput[];
}
