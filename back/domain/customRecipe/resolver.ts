import { BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { CustomFoodRepository } from '../customFood/repository';
import { User } from '../user/model';
import { CustomRecipeInput, UpdateCustomRecipeInput } from './input';
import { CustomRecipe } from './model';
import { CustomRecipeRepository } from './repository';
import { CustomRecipeIngredient } from './type';
import { customRecipeConstraints, isCustomFoodId } from './utils';

@Resolver(() => CustomRecipe)
@UseGuards(AuthGuard)
export class CustomRecipeResolver {
  constructor(
    private readonly recipes: CustomRecipeRepository,
    private readonly customFoods: CustomFoodRepository,
  ) {}

  @Query(() => [CustomRecipe], {
    description: 'Every recipe the signed-in user wrote for themselves.',
  })
  async myCustomRecipes(@CurrentUser() user: User): Promise<CustomRecipe[]> {
    return this.recipes.findByOwner(user.id);
  }

  @Mutation(() => CustomRecipe)
  async createCustomRecipe(
    @CurrentUser() user: User,
    @Args('input') input: CustomRecipeInput,
  ): Promise<CustomRecipe> {
    const { maxItems } = customRecipeConstraints();
    if ((await this.recipes.countByOwner(user.id)) >= maxItems) {
      throw new BadRequestException(`A book holds at most ${maxItems} recipes.`);
    }
    await this.assertOwnsCustomIngredients(user.id, input.ingredients);

    return this.recipes.add(user.id, input);
  }

  @Mutation(() => CustomRecipe, { description: 'Replaces a custom recipe wholesale.' })
  async updateCustomRecipe(
    @CurrentUser() user: User,
    @Args('input') input: UpdateCustomRecipeInput,
  ): Promise<CustomRecipe> {
    const { id, ...recipe } = input;
    await this.assertOwnsCustomIngredients(user.id, recipe.ingredients);
    const updated = await this.recipes.update(user.id, id, recipe);

    // Somebody else's recipe and one that never existed answer the same way on
    // purpose: telling them apart would confirm that an identifier is real to
    // whoever asked.
    if (updated === undefined) throw new NotFoundException('No such recipe.');

    return updated;
  }

  @Mutation(() => Boolean, { description: 'Removes a custom recipe.' })
  async deleteCustomRecipe(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    if (!(await this.recipes.remove(user.id, id))) throw new NotFoundException('No such recipe.');

    return true;
  }

  // A custom food referenced here has to belong to whoever is writing the
  // recipe: without this check, one account could weigh out a food it can
  // neither see nor edit, guessed from somebody else's id.
  private async assertOwnsCustomIngredients(
    userId: string,
    ingredients: CustomRecipeIngredient[],
  ): Promise<void> {
    const customIds = [
      ...new Set(ingredients.map(({ foodId }): string => foodId).filter(isCustomFoodId)),
    ];
    if (customIds.length === 0) return;

    const owned = await this.customFoods.ownedByUser(userId, customIds);
    const missing = customIds.filter((id): boolean => !owned.has(id));
    if (missing.length > 0) throw new BadRequestException('No such food.');
  }
}
