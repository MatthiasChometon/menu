import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { CustomRecipeInput, UpdateCustomRecipeInput } from './input';
import { CustomRecipe } from './model';
import { CustomRecipeService } from './service';

@Resolver(() => CustomRecipe)
@UseGuards(AuthGuard)
export class CustomRecipeResolver {
  constructor(private readonly recipes: CustomRecipeService) {}

  @Query(() => [CustomRecipe], {
    description: 'Every recipe the signed-in user wrote for themselves.',
  })
  async myCustomRecipes(@CurrentUser() user: User): Promise<CustomRecipe[]> {
    return this.recipes.mine(user.id);
  }

  @Mutation(() => CustomRecipe)
  async createCustomRecipe(
    @CurrentUser() user: User,
    @Args('input') input: CustomRecipeInput,
  ): Promise<CustomRecipe> {
    return this.recipes.create(user.id, input);
  }

  @Mutation(() => CustomRecipe, { description: 'Replaces a custom recipe wholesale.' })
  async updateCustomRecipe(
    @CurrentUser() user: User,
    @Args('input') input: UpdateCustomRecipeInput,
  ): Promise<CustomRecipe> {
    const { id, ...recipe } = input;

    return this.recipes.replace(user.id, id, recipe);
  }

  @Mutation(() => Boolean, { description: 'Removes a custom recipe.' })
  async deleteCustomRecipe(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    await this.recipes.remove(user.id, id);

    return true;
  }
}
