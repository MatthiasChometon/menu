import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { weekPlan } from './schema';
import type { PlannedDay, WeekPlanRecord } from './type';

@Injectable()
export class WeekPlanRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // Replaced wholesale rather than merged: the caller sends the week it wants,
  // and a partial merge would silently keep a dish the reader had removed.
  async save(userId: string, weekOf: string, days: PlannedDay[]): Promise<WeekPlanRecord> {
    const [record] = await this.database
      .insert(weekPlan)
      .values({ userId, weekOf, days, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [weekPlan.userId, weekPlan.weekOf],
        set: { days, updatedAt: new Date() },
      })
      .returning();

    return this.toRecord(record);
  }

  async findOne(userId: string, weekOf: string): Promise<WeekPlanRecord | undefined> {
    const [record] = await this.database
      .select()
      .from(weekPlan)
      .where(and(eq(weekPlan.userId, userId), eq(weekPlan.weekOf, weekOf)));

    return record === undefined ? undefined : this.toRecord(record);
  }

  async findAll(userId: string): Promise<WeekPlanRecord[]> {
    const records = await this.database
      .select()
      .from(weekPlan)
      .where(eq(weekPlan.userId, userId))
      .orderBy(desc(weekPlan.weekOf));

    return records.map((record): WeekPlanRecord => this.toRecord(record));
  }

  async remove(userId: string, weekOf: string): Promise<boolean> {
    const removed = await this.database
      .delete(weekPlan)
      .where(and(eq(weekPlan.userId, userId), eq(weekPlan.weekOf, weekOf)))
      .returning();

    return removed.length > 0;
  }

  private toRecord(record: typeof weekPlan.$inferSelect): WeekPlanRecord {
    return { weekOf: record.weekOf, days: record.days, updatedAt: record.updatedAt };
  }
}
