import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Appetite,
  DailyActivity,
  Goal,
  Sex,
  StarchQuality,
  TrainingType,
} from '../profile/enum';
import { NutritionTargets } from '../profile/model';

@ObjectType({ description: 'Somebody else the account holder cooks for.' })
export class HouseholdMember {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'What to call them on the recipe page. Not a login.' })
  name!: string;

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

  @Field(() => NutritionTargets, {
    description: 'Worked out from the answers, the same way the account holder’s own are.',
  })
  targets!: NutritionTargets;
}
