import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { weight } from './schema';
import { WeightEntryDraft, WeightEntryRecord } from './type';
import { roundToOneDecimal } from './utils';

@Injectable()
export class WeightRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async add(userId: string, entry: WeightEntryDraft): Promise<WeightEntryRecord> {
    const [record] = await this.database
      .insert(weight)
      .values({ userId, date: entry.date, kg: roundToOneDecimal(entry.kg) })
      .returning();

    return this.toEntry(record);
  }

  // The owner is part of the condition, not checked afterwards: an id guessed
  // from somewhere else must not match a row belonging to anybody but the
  // caller, and the surest way to guarantee that is to never select it.
  async update(
    userId: string,
    id: string,
    entry: WeightEntryDraft,
  ): Promise<WeightEntryRecord | undefined> {
    const [record] = await this.database
      .update(weight)
      .set({ date: entry.date, kg: roundToOneDecimal(entry.kg) })
      .where(and(eq(weight.userId, userId), eq(weight.id, id)))
      .returning();

    return record === undefined ? undefined : this.toEntry(record);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const removed = await this.database
      .delete(weight)
      .where(and(eq(weight.userId, userId), eq(weight.id, id)))
      .returning({ id: weight.id });

    return removed.length > 0;
  }

  // Newest first, tie-broken on the identifier: without it two entries sharing
  // a date come back in a different order on every request.
  async findByUser(userId: string): Promise<WeightEntryRecord[]> {
    const records = await this.database
      .select()
      .from(weight)
      .where(eq(weight.userId, userId))
      .orderBy(desc(weight.date), desc(weight.id));

    return records.map((record): WeightEntryRecord => this.toEntry(record));
  }

  private toEntry(record: typeof weight.$inferSelect): WeightEntryRecord {
    return { id: record.id, date: record.date, kg: record.kg };
  }
}
