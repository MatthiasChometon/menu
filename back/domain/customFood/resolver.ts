import { BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { CustomFoodInput, UpdateCustomFoodInput } from './input';
import { CustomFood } from './model';
import { CustomFoodRepository } from './repository';
import { customFoodConstraints } from './utils';

@Resolver(() => CustomFood)
@UseGuards(AuthGuard)
export class CustomFoodResolver {
  constructor(private readonly foods: CustomFoodRepository) {}

  @Query(() => [CustomFood], {
    description: 'Every food the signed-in user defined for themselves.',
  })
  async myCustomFoods(@CurrentUser() user: User): Promise<CustomFood[]> {
    return this.foods.findByOwner(user.id);
  }

  @Mutation(() => CustomFood)
  async createCustomFood(
    @CurrentUser() user: User,
    @Args('input') input: CustomFoodInput,
  ): Promise<CustomFood> {
    const { maxItems } = customFoodConstraints();
    if ((await this.foods.countByOwner(user.id)) >= maxItems) {
      throw new BadRequestException(`A pantry holds at most ${maxItems} foods.`);
    }

    return this.foods.add(user.id, input);
  }

  @Mutation(() => CustomFood, { description: 'Replaces a custom food wholesale.' })
  async updateCustomFood(
    @CurrentUser() user: User,
    @Args('input') input: UpdateCustomFoodInput,
  ): Promise<CustomFood> {
    const { id, ...food } = input;
    const updated = await this.foods.update(user.id, id, food);

    // Somebody else's food and one that never existed answer the same way on
    // purpose: telling them apart would confirm that an identifier is real to
    // whoever asked.
    if (updated === undefined) throw new NotFoundException('No such food.');

    return updated;
  }

  @Mutation(() => Boolean, { description: 'Removes a custom food.' })
  async deleteCustomFood(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    if (!(await this.foods.remove(user.id, id))) throw new NotFoundException('No such food.');

    return true;
  }
}
