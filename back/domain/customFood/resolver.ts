import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { CustomFoodInput, UpdateCustomFoodInput } from './input';
import { CustomFood } from './model';
import { CustomFoodService } from './service';

@Resolver(() => CustomFood)
@UseGuards(AuthGuard)
export class CustomFoodResolver {
  constructor(private readonly foods: CustomFoodService) {}

  @Query(() => [CustomFood], {
    description: 'Every food the signed-in user defined for themselves.',
  })
  async myCustomFoods(@CurrentUser() user: User): Promise<CustomFood[]> {
    return this.foods.mine(user.id);
  }

  @Mutation(() => CustomFood)
  async createCustomFood(
    @CurrentUser() user: User,
    @Args('input') input: CustomFoodInput,
  ): Promise<CustomFood> {
    return this.foods.create(user.id, input);
  }

  @Mutation(() => CustomFood, { description: 'Replaces a custom food wholesale.' })
  async updateCustomFood(
    @CurrentUser() user: User,
    @Args('input') input: UpdateCustomFoodInput,
  ): Promise<CustomFood> {
    const { id, ...food } = input;

    return this.foods.replace(user.id, id, food);
  }

  @Mutation(() => Boolean, { description: 'Removes a custom food.' })
  async deleteCustomFood(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    await this.foods.remove(user.id, id);

    return true;
  }
}
