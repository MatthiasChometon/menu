import { Args, Query, Resolver } from '@nestjs/graphql';
import { MeasurementsInput } from './input';
import { NutritionTargets } from './model';
import { NutritionTargetsService } from './targets.service';

@Resolver(() => NutritionTargets)
export class ProfileResolver {
  constructor(private readonly targets: NutritionTargetsService) {}

  @Query(() => NutritionTargets, {
    description:
      'Daily targets for the given measurements, without needing an account: this is what the onboarding form previews as it is filled in.',
  })
  nutritionTargets(@Args('input') input: MeasurementsInput): NutritionTargets {
    return this.targets.calculate(input);
  }
}
