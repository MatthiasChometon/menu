import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { MeasurementsInput } from './input';
import { NutritionTargets, Profile } from './model';
import { ProfileRepository } from './repository';
import { NutritionTargetsService } from './targets.service';
import { Measurements } from './type';

@Resolver(() => Profile)
export class ProfileResolver {
  constructor(
    private readonly targets: NutritionTargetsService,
    private readonly profiles: ProfileRepository,
  ) {}

  @Query(() => NutritionTargets, {
    description:
      'Daily targets for the given answers, without needing an account: this is what the onboarding form previews as it is filled in.',
  })
  nutritionTargets(@Args('input') input: MeasurementsInput): NutritionTargets {
    return this.targets.calculate(input);
  }

  @Query(() => Profile, {
    nullable: true,
    description: 'The signed-in user profile, or null when the form has never been filled in.',
  })
  @UseGuards(AuthGuard)
  async myProfile(@CurrentUser() user: User): Promise<Profile | undefined> {
    const measurements = await this.profiles.findByUserId(user.id);

    return measurements === undefined ? undefined : this.withTargets(measurements);
  }

  @Mutation(() => Profile, { description: 'Creates the profile, or replaces it wholesale.' })
  @UseGuards(AuthGuard)
  async saveProfile(
    @CurrentUser() user: User,
    @Args('input') input: MeasurementsInput,
  ): Promise<Profile> {
    return this.withTargets(await this.profiles.save(user.id, input));
  }

  // Targets are derived on read rather than stored: keeping a copy in the row
  // would let it drift the day a coefficient changes.
  private withTargets(measurements: Measurements): Profile {
    return { ...measurements, targets: this.targets.calculate(measurements) };
  }
}
