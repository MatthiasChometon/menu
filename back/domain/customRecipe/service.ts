import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomFoodRepository } from '../customFood/repository';
import { CustomRecipeRepository } from './repository';
import type { CustomRecipeDraft, CustomRecipeIngredient, CustomRecipeRecord } from './type';
import { customRecipeConstraints, isCustomFoodId } from './utils';

@Injectable()
export class CustomRecipeService {
  constructor(
    private readonly recipes: CustomRecipeRepository,
    private readonly customFoods: CustomFoodRepository,
  ) {}

  mine(userId: string): Promise<CustomRecipeRecord[]> {
    return this.recipes.findByOwner(userId);
  }

  async create(userId: string, recipe: CustomRecipeDraft): Promise<CustomRecipeRecord> {
    const { maxItems } = customRecipeConstraints();
    await this.assertOwnsCustomIngredients(userId, recipe.ingredients);
    const created = await this.recipes.addUnlessFull(userId, recipe, maxItems);
    if (created === undefined) {
      throw new BadRequestException(`A book holds at most ${maxItems} recipes.`);
    }

    return created;
  }

  async replace(
    userId: string,
    id: string,
    recipe: CustomRecipeDraft,
  ): Promise<CustomRecipeRecord> {
    await this.assertOwnsCustomIngredients(userId, recipe.ingredients);
    const updated = await this.recipes.update(userId, id, recipe);

    // Somebody else's recipe and one that never existed answer the same way on
    // purpose: telling them apart would confirm that an identifier is real to
    // whoever asked.
    if (updated === undefined) throw new NotFoundException('No such recipe.');

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.recipes.remove(userId, id))) throw new NotFoundException('No such recipe.');
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
