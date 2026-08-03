import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';

@ObjectType({ description: 'Daily nutrition targets worked out from a profile.' })
export class NutritionTargets {
  @Field(() => Int)
  kcal!: number;

  @Field(() => Int, { description: 'Grams of protein per day.' })
  protein!: number;

  @Field(() => Int, { description: 'Grams of fat per day.' })
  fat!: number;

  @Field(() => Int, { description: 'Grams of carbohydrate per day.' })
  carbs!: number;

  @Field(() => Int, { description: 'Grams of fibre per day.' })
  fiber!: number;
}

@ObjectType({ description: 'What someone answered, and what those answers work out to.' })
export class Profile {
  @Field(() => Sex)
  sex!: Sex;

  @Field(() => Int)
  age!: number;

  @Field(() => Int)
  heightCm!: number;

  @Field(() => Int)
  weightKg!: number;

  @Field(() => DailyActivity)
  dailyActivity!: DailyActivity;

  @Field(() => Int)
  trainingDaysPerWeek!: number;

  @Field(() => TrainingType)
  trainingType!: TrainingType;

  @Field(() => StarchQuality)
  starchQuality!: StarchQuality;

  @Field(() => Appetite)
  appetite!: Appetite;

  @Field(() => Goal)
  goal!: Goal;

  @Field(() => NutritionTargets)
  targets!: NutritionTargets;
}
