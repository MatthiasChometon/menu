import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { insertedRow } from '../../infrastructure/database/rows';
import { user } from '../user/schema';
import { customRecipe, StoredIngredients } from './schema';
import { CustomRecipeDraft, CustomRecipeIngredient, CustomRecipeRecord } from './type';

const toStoredIngredients = (ingredients: CustomRecipeIngredient[]): StoredIngredients =>
  Object.fromEntries(ingredients.map(({ foodId, grams }): [string, number] => [foodId, grams]));

const toIngredientList = (stored: StoredIngredients): CustomRecipeIngredient[] =>
  Object.entries(stored).map(([foodId, grams]): CustomRecipeIngredient => ({ foodId, grams }));

@Injectable()
export class CustomRecipeRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // Counted and inserted under a lock on the owner, so two adds sent together
  // cannot both see room for one more: nothing comes back when the book is
  // already full.
  async addUnlessFull(
    userId: string,
    recipe: CustomRecipeDraft,
    maxItems: number,
  ): Promise<CustomRecipeRecord | undefined> {
    return this.database.transaction(
      async (transaction): Promise<CustomRecipeRecord | undefined> => {
        await transaction
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, userId))
          .for('update');
        const [current] = await transaction
          .select({ total: count() })
          .from(customRecipe)
          .where(eq(customRecipe.userId, userId));
        if ((current?.total ?? 0) >= maxItems) return undefined;

        const records = await transaction
          .insert(customRecipe)
          .values({ userId, ...recipe, ingredients: toStoredIngredients(recipe.ingredients) })
          .returning();

        return this.toRecipe(insertedRow(records));
      },
    );
  }

  // The owner is part of the condition, not checked afterwards: an id guessed
  // from somewhere else must not match a row belonging to anybody but the
  // caller, and the surest way to guarantee that is to never select it.
  async update(
    userId: string,
    id: string,
    recipe: CustomRecipeDraft,
  ): Promise<CustomRecipeRecord | undefined> {
    const [record] = await this.database
      .update(customRecipe)
      .set({ ...recipe, ingredients: toStoredIngredients(recipe.ingredients) })
      .where(and(eq(customRecipe.userId, userId), eq(customRecipe.id, id)))
      .returning();

    return record === undefined ? undefined : this.toRecipe(record);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const removed = await this.database
      .delete(customRecipe)
      .where(and(eq(customRecipe.userId, userId), eq(customRecipe.id, id)))
      .returning({ id: customRecipe.id });

    return removed.length > 0;
  }

  // Ordered by when they were added, tie-broken on the identifier: without it
  // an edited row comes back in a different place and the book appears to
  // shuffle itself every time somebody corrects a recipe.
  async findByOwner(userId: string): Promise<CustomRecipeRecord[]> {
    const records = await this.database
      .select()
      .from(customRecipe)
      .where(eq(customRecipe.userId, userId))
      .orderBy(customRecipe.createdAt, customRecipe.id);

    return records.map((record): CustomRecipeRecord => this.toRecipe(record));
  }

  private toRecipe(record: typeof customRecipe.$inferSelect): CustomRecipeRecord {
    return {
      id: record.id,
      name: record.name,
      slot: record.slot,
      ingredients: toIngredientList(record.ingredients),
      steps: record.steps,
      prepMinutes: record.prepMinutes,
      batch: record.batch,
    };
  }
}
