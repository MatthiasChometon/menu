import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { customFood } from './schema';
import { CustomFoodDraft, CustomFoodRecord } from './type';

@Injectable()
export class CustomFoodRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async add(userId: string, food: CustomFoodDraft): Promise<CustomFoodRecord> {
    const [record] = await this.database
      .insert(customFood)
      .values({ userId, ...food })
      .returning();

    return this.toFood(record);
  }

  // The owner is part of the condition, not checked afterwards: an id guessed
  // from somewhere else must not match a row belonging to anybody but the
  // caller, and the surest way to guarantee that is to never select it.
  async update(
    userId: string,
    id: string,
    food: CustomFoodDraft,
  ): Promise<CustomFoodRecord | undefined> {
    const [record] = await this.database
      .update(customFood)
      .set(food)
      .where(and(eq(customFood.userId, userId), eq(customFood.id, id)))
      .returning();

    return record === undefined ? undefined : this.toFood(record);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const removed = await this.database
      .delete(customFood)
      .where(and(eq(customFood.userId, userId), eq(customFood.id, id)))
      .returning({ id: customFood.id });

    return removed.length > 0;
  }

  // Ordered by when they were added, tie-broken on the identifier: without it
  // an edited row comes back in a different place and the list appears to
  // shuffle itself every time somebody corrects one.
  async findByOwner(userId: string): Promise<CustomFoodRecord[]> {
    const records = await this.database
      .select()
      .from(customFood)
      .where(eq(customFood.userId, userId))
      .orderBy(customFood.createdAt, customFood.id);

    return records.map((record): CustomFoodRecord => this.toFood(record));
  }

  async countByOwner(userId: string): Promise<number> {
    const [row] = await this.database
      .select({ total: count() })
      .from(customFood)
      .where(eq(customFood.userId, userId));

    return row?.total ?? 0;
  }

  // What a custom recipe's ingredients are checked against: a recipe may point
  // at another custom food, but never at somebody else's.
  async ownedByUser(userId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();

    const records = await this.database
      .select({ id: customFood.id })
      .from(customFood)
      .where(and(eq(customFood.userId, userId), inArray(customFood.id, ids)));

    return new Set(records.map((record): string => record.id));
  }

  private toFood(record: typeof customFood.$inferSelect): CustomFoodRecord {
    return {
      id: record.id,
      name: record.name,
      kcal: record.kcal,
      protein: record.protein,
      fat: record.fat,
      carbs: record.carbs,
      fiber: record.fiber,
      pricePerKg: record.pricePerKg,
    };
  }
}
