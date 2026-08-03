import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { ActivityLevel, Goal, Sex } from './enum';
import { profileConstraints } from './utils';

const { minAge, maxAge, minHeightCm, maxHeightCm, minWeightKg, maxWeightKg } = profileConstraints();

@InputType()
export class MeasurementsInput {
  @Field(() => Sex)
  @IsEnum(Sex)
  sex!: Sex;

  @Field(() => Int)
  @IsInt()
  @Min(minAge)
  @Max(maxAge)
  age!: number;

  @Field(() => Int)
  @IsInt()
  @Min(minHeightCm)
  @Max(maxHeightCm)
  heightCm!: number;

  @Field(() => Int)
  @IsInt()
  @Min(minWeightKg)
  @Max(maxWeightKg)
  weightKg!: number;

  @Field(() => ActivityLevel)
  @IsEnum(ActivityLevel)
  activityLevel!: ActivityLevel;

  @Field(() => Goal)
  @IsEnum(Goal)
  goal!: Goal;
}
