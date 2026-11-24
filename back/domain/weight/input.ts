import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { IsISO8601, IsNumber, IsUUID, Matches, Max, Min } from 'class-validator';
import { weightEntryConstraints } from './utils';

const { minKg, maxKg } = weightEntryConstraints();

@InputType({ description: 'One weigh-in to log.' })
export class WeightEntryInput {
  @Field({ description: 'Calendar date the weigh-in happened on, YYYY-MM-DD.' })
  // Strict: a day that exists, so 2026-02-30 is refused here, not by the database.
  @IsISO8601({ strict: true })
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
