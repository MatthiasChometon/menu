import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { groceryBasketLine } from './schema';
import { BasketLine } from './type';

@Injectable()
export class GroceryBasketRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async saveLines(jobId: string, lines: BasketLine[]): Promise<void> {
    if (lines.length === 0) {
      return;
    }

    await this.database.insert(groceryBasketLine).values(
      lines.map((line) => ({
        jobId,
        foodId: line.foodId,
        grams: line.grams,
        fromPantry: line.fromPantry,
        ean: line.product?.ean ?? null,
        productName: line.product?.name ?? null,
        unitSize: line.product?.size ?? null,
        units: line.units ?? null,
      })),
    );
  }

  async linesOf(jobId: string): Promise<BasketLine[]> {
    const records = await this.database
      .select()
      .from(groceryBasketLine)
      .where(eq(groceryBasketLine.jobId, jobId))
      .orderBy(groceryBasketLine.foodId);

    return records.map((record): BasketLine => this.toLine(record));
  }

  private toLine(record: typeof groceryBasketLine.$inferSelect): BasketLine {
    const known =
      record.ean !== null && record.productName !== null && record.unitSize !== null
        ? { ean: record.ean, name: record.productName, size: record.unitSize }
        : undefined;

    return {
      foodId: record.foodId,
      grams: record.grams,
      fromPantry: record.fromPantry,
      product: known,
      units: record.units ?? undefined,
    };
  }
}
