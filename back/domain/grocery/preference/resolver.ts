import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { GroceryPreferenceInput } from './input';
import { GroceryPreference } from './model';
import { GroceryPreferenceRepository } from './repository';

@Resolver(() => GroceryPreference)
export class GroceryPreferenceResolver {
  constructor(private readonly preferences: GroceryPreferenceRepository) {}

  @Query(() => GroceryPreference, { description: 'What this account wants of its orders.' })
  @UseGuards(AuthGuard)
  async myGroceryPreference(@CurrentUser() user: User): Promise<GroceryPreference> {
    return this.preferences.forUser(user.id);
  }

  @Mutation(() => GroceryPreference)
  @UseGuards(AuthGuard)
  async saveGroceryPreference(
    @CurrentUser() user: User,
    @Args('input') input: GroceryPreferenceInput,
  ): Promise<GroceryPreference> {
    await this.preferences.save(user.id, input.alertThresholdCents);

    return this.preferences.forUser(user.id);
  }
}
