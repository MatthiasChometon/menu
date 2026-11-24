import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { groceryBasketLine } from './schema';
import { BasketLine } from './type';

@Injectable()
export class GroceryBasketRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async linesOf(jobId: string): Promise<BasketLine[]> {
    const records = await this.database
      .select()
      .from(groceryBasketLine)
      .where(eq(groceryBasketLine.jobId, jobId))
      .orderBy(groceryBasketLine.foodId, groceryBasketLine.id);

    return records.map((record): BasketLine => this.toLine(record));
  }

  private toLine(record: typeof groceryBasketLine.$inferSelect): BasketLine {
    const known =
      record.ean !== null && record.productName !== null && record.unitSize !== null
        ? { ean: record.ean, name: record.productName, size: record.unitSize }
        : undefined;

    return {
      foodId: record.foodId,
      label: record.label ?? undefined,
      grams: record.grams,
      fromPantry: record.fromPantry,
      product: known,
      units: record.units ?? undefined,
    };
  }
}
