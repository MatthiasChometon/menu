import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';
import { profileConstraints } from './utils';

const {
  minAge,
  maxAge,
  minHeightCm,
  maxHeightCm,
  minWeightKg,
  maxWeightKg,
  maxTrainingDaysPerWeek,
} = profileConstraints();

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

  @Field(() => DailyActivity)
  @IsEnum(DailyActivity)
  dailyActivity!: DailyActivity;

  @Field(() => Int, { description: 'Training sessions in a normal week.' })
  @IsInt()
  @Min(0)
  @Max(maxTrainingDaysPerWeek)
  trainingDaysPerWeek!: number;

  @Field(() => TrainingType)
  @IsEnum(TrainingType)
  trainingType!: TrainingType;

  @Field(() => StarchQuality)
  @IsEnum(StarchQuality)
  starchQuality!: StarchQuality;

  @Field(() => Appetite)
  @IsEnum(Appetite)
  appetite!: Appetite;

  @Field(() => Goal)
  @IsEnum(Goal)
  goal!: Goal;
}
