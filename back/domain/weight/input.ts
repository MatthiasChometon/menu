import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { IsDateString, IsNumber, IsUUID, Matches, Max, Min } from 'class-validator';
import { weightEntryConstraints } from './utils';

const { minKg, maxKg } = weightEntryConstraints();

@InputType({ description: 'One weigh-in to log.' })
export class WeightEntryInput {
  @Field({ description: 'Calendar date the weigh-in happened on, YYYY-MM-DD.' })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be formatted as YYYY-MM-DD.' })
  date!: string;

  @Field(() => Float)
  @IsNumber()
  @Min(minKg)
  @Max(maxKg)
  kg!: number;
}

@InputType()
export class UpdateWeightEntryInput extends WeightEntryInput {
  @Field(() => ID)
  @IsUUID()
  id!: string;
}
