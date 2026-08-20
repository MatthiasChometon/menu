import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { groceryPantry } from './schema';

@Injectable()
export class GroceryPantryRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async forUser(userId: string): Promise<Map<string, number>> {
    const records = await this.database
      .select({ foodId: groceryPantry.foodId, grams: groceryPantry.grams })
      .from(groceryPantry)
      .where(eq(groceryPantry.userId, userId));

    return new Map(records.map((record): [string, number] => [record.foodId, record.grams]));
  }

  // The cupboard is restated whole rather than adjusted line by line: a run
  // knows what is left of everything it touched, and a half-applied update
  // would quietly make the next order buy too much or too little.
  async replace(userId: string, leftovers: Map<string, number>): Promise<void> {
    const rows = [...leftovers.entries()]
      .filter(([, grams]): boolean => grams > 0)
      .map(([foodId, grams]) => ({ userId, foodId, grams, updatedAt: new Date() }));

    await this.database.transaction(async (transaction): Promise<void> => {
      await transaction.delete(groceryPantry).where(eq(groceryPantry.userId, userId));
      if (rows.length > 0) {
        await transaction.insert(groceryPantry).values(rows);
      }
    });
  }

  async set(userId: string, foodId: string, grams: number): Promise<void> {
    await this.database
      .insert(groceryPantry)
      .values({ userId, foodId, grams, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [groceryPantry.userId, groceryPantry.foodId],
        set: { grams: sql`excluded.grams`, updatedAt: sql`excluded.updated_at` },
      });
  }
}
