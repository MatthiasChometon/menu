import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { insertedRow } from '../../../infrastructure/database/rows';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { basketRowsOf } from '../basket/rows';
import { groceryBasketLine } from '../basket/schema';
import { GroceryJobStatus } from '../enum';
import { GroceryJob, GroceryJobEvent } from './model';
import { groceryJob, groceryJobEvent } from './schema';
import { JobClosing, NewJob, ReportedEvent } from './type';

@Injectable()
export class GroceryJobRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // The job and its basket go in together: a run with no lines would be
  // picked up by a browser and fill an empty basket.
  async create(input: NewJob): Promise<GroceryJob> {
    const record = await this.database.transaction(
      async (transaction): Promise<typeof groceryJob.$inferSelect> => {
        const created = insertedRow(
          await transaction
            .insert(groceryJob)
            .values({
              userId: input.userId,
              weekOf: input.weekOf,
              status: GroceryJobStatus.PENDING,
              alertThresholdCents: input.alertThresholdCents ?? null,
            })
            .returning(),
        );

        if (input.lines.length > 0) {
          await transaction.insert(groceryBasketLine).values(basketRowsOf(created.id, input.lines));
        }

        return created;
      },
    );

    return this.toJob(record, []);
  }

  async findForUser(userId: string, jobId: string): Promise<GroceryJob | undefined> {
    const [record] = await this.database
      .select()
      .from(groceryJob)
      .where(and(eq(groceryJob.id, jobId), eq(groceryJob.userId, userId)));

    if (record === undefined) {
      return undefined;
    }

    return this.toJob(record, await this.eventsOf(record.id));
  }

  async listForUser(userId: string): Promise<GroceryJob[]> {
    const records = await this.database
      .select()
      .from(groceryJob)
      .where(eq(groceryJob.userId, userId))
      .orderBy(desc(groceryJob.createdAt), groceryJob.id);

    return records.map((record): GroceryJob => this.toJob(record, []));
  }

  // Two browsers of the same account may ask at the same moment, so the row is
  // locked and skipped rather than read then written: without this both would
  // walk away with the same run and fill the basket twice.
  async claimNext(userId: string, deviceId: string): Promise<GroceryJob | undefined> {
    const [record] = await this.database
      .update(groceryJob)
      .set({ status: GroceryJobStatus.RUNNING, deviceId, startedAt: new Date() })
      .where(
        sql`${groceryJob.id} = (
          select ${groceryJob.id} from ${groceryJob}
          where ${groceryJob.userId} = ${userId} and ${groceryJob.status} = ${GroceryJobStatus.PENDING}
          order by ${groceryJob.createdAt}, ${groceryJob.id}
          limit 1
          for update skip locked
        )`,
      )
      .returning();

    return record === undefined ? undefined : this.toJob(record, []);
  }

  // Reported by the browser that claimed the run, so the run is checked to be
  // its own before anything is written: a token alone must not let one browser
  // write into another one's history.
  async appendEvent(
    jobId: string,
    deviceId: string,
    event: ReportedEvent,
  ): Promise<GroceryJobEvent | undefined> {
    const [owned] = await this.database
      .select({ id: groceryJob.id })
      .from(groceryJob)
      .where(and(eq(groceryJob.id, jobId), eq(groceryJob.deviceId, deviceId)));

    if (owned === undefined) {
      return undefined;
    }

    const { kind, ...details } = event;
    const records = await this.database
      .insert(groceryJobEvent)
      .values({ jobId, kind, payload: details })
      .returning();

    return this.toEvent(insertedRow(records));
  }

  async finish(
    jobId: string,
    deviceId: string,
    closing: JobClosing,
  ): Promise<GroceryJob | undefined> {
    const [record] = await this.database
      .update(groceryJob)
      .set({
        status: closing.status,
        finishedAt: new Date(),
        productsCents: closing.productsCents ?? null,
        deliveryFeesCents: closing.deliveryFeesCents ?? null,
        shortOfMinimumCents: closing.shortOfMinimumCents ?? null,
      })
      .where(and(eq(groceryJob.id, jobId), eq(groceryJob.deviceId, deviceId)))
      .returning();

    if (record === undefined) {
      return undefined;
    }

    return this.toJob(record, await this.eventsOf(record.id));
  }

  private async eventsOf(jobId: string): Promise<GroceryJobEvent[]> {
    const records = await this.database
      .select()
      .from(groceryJobEvent)
      .where(eq(groceryJobEvent.jobId, jobId))
      .orderBy(groceryJobEvent.at, groceryJobEvent.id);

    return records.map((record): GroceryJobEvent => this.toEvent(record));
  }

  private toJob(record: typeof groceryJob.$inferSelect, events: GroceryJobEvent[]): GroceryJob {
    return {
      id: record.id,
      weekOf: record.weekOf,
      status: record.status,
      alertThresholdCents: record.alertThresholdCents ?? undefined,
      createdAt: record.createdAt,
      startedAt: record.startedAt ?? undefined,
      finishedAt: record.finishedAt ?? undefined,
      productsCents: record.productsCents ?? undefined,
      deliveryFeesCents: record.deliveryFeesCents ?? undefined,
      shortOfMinimumCents: record.shortOfMinimumCents ?? undefined,
      // A run that never reported a total has not gone over anything.
      overThreshold:
        record.alertThresholdCents !== null &&
        record.productsCents !== null &&
        record.productsCents > record.alertThresholdCents,
      events,
      lines: [],
      slotWindows: [],
    };
  }

  private toEvent(record: typeof groceryJobEvent.$inferSelect): GroceryJobEvent {
    const details = record.payload ?? {};

    return {
      id: record.id,
      kind: record.kind,
      at: record.at,
      foodId: details.foodId,
      label: details.label,
      detail: details.detail,
    };
  }
}
