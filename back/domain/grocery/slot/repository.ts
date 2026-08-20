import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { GrocerySlotWindow } from './model';
import { grocerySlotWindow } from './schema';

@Injectable()
export class GrocerySlotRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async forUser(userId: string): Promise<GrocerySlotWindow[]> {
    const records = await this.database
      .select({
        weekday: grocerySlotWindow.weekday,
        startMinute: grocerySlotWindow.startMinute,
        endMinute: grocerySlotWindow.endMinute,
      })
      .from(grocerySlotWindow)
      .where(eq(grocerySlotWindow.userId, userId))
      .orderBy(grocerySlotWindow.weekday, grocerySlotWindow.startMinute);

    return records;
  }

  // Restated whole: windows are read as a set, and half of a set is a different
  // set rather than an incomplete one.
  async replace(userId: string, windows: GrocerySlotWindow[]): Promise<GrocerySlotWindow[]> {
    await this.database.transaction(async (transaction): Promise<void> => {
      await transaction.delete(grocerySlotWindow).where(eq(grocerySlotWindow.userId, userId));
      if (windows.length > 0) {
        await transaction
          .insert(grocerySlotWindow)
          .values(windows.map((window) => ({ userId, ...window })));
      }
    });

    return this.forUser(userId);
  }
}
