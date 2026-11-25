import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, type SQL, sql } from 'drizzle-orm';
import { insertedRow } from '../../../infrastructure/database/rows';
import { sqlStateOf, UNIQUE_VIOLATION } from '../../../infrastructure/database/sql-state';
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from '../../../infrastructure/database/token';
import { basketRowsOf } from '../basket/rows';
import { groceryBasketLine } from '../basket/schema';
import { GroceryJobEventKind, GroceryJobStatus } from '../enum';
import { GroceryJob, GroceryJobEvent } from './model';
import { groceryJob, groceryJobEvent } from './schema';
import {
  ClosedJob,
  EventRecord,
  JobClosing,
  JobRecord,
  NewJob,
  ReportedEvent,
  JobEventDetails,
} from './type';

// Thrown inside the closing transaction to undo what was done for a run that
// someone else had already closed.
class AlreadyClosed extends Error {}

@Injectable()
export class GroceryJobRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // The job and its basket go in together: a run with no lines would be
  // picked up by a browser and fill an empty basket.
  async create(input: NewJob): Promise<GroceryJob> {
    const record = await this.database.transaction(async (transaction): Promise<JobRecord> => {
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
    });

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
  //
  // The browser retries a claim whose answer it lost. Its key says which attempt
  // that is: the run already taken under it is handed back, never a second one.
  async claimNext(
    userId: string,
    deviceId: string,
    claimKey?: string,
  ): Promise<GroceryJob | undefined> {
    const already = await this.claimedUnder(deviceId, claimKey);
    if (already !== undefined) {
      return this.toJob(already, []);
    }

    try {
      const [record] = await this.database
        .update(groceryJob)
        .set({
          status: GroceryJobStatus.RUNNING,
          deviceId,
          startedAt: new Date(),
          claimKey: claimKey ?? null,
        })
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
    } catch (error) {
      return this.claimedBeforeUs(error, deviceId, claimKey);
    }
  }

  // A retry that overlaps its still-running original: the original has taken
  // a run under this key but not committed yet, so the check above saw nothing,
  // the row it locked was skipped, and the key then met the unique constraint.
  // That means the run is the original's; hand it back instead of failing.
  private async claimedBeforeUs(
    error: unknown,
    deviceId: string,
    claimKey: string | undefined,
  ): Promise<GroceryJob> {
    const already =
      sqlStateOf(error) === UNIQUE_VIOLATION
        ? await this.claimedUnder(deviceId, claimKey)
        : undefined;
    if (already === undefined) {
      throw error;
    }

    return this.toJob(already, []);
  }

  private async claimedUnder(
    deviceId: string,
    claimKey: string | undefined,
  ): Promise<JobRecord | undefined> {
    if (claimKey === undefined) {
      return undefined;
    }

    const [record] = await this.database
      .select()
      .from(groceryJob)
      .where(and(eq(groceryJob.deviceId, deviceId), eq(groceryJob.claimKey, claimKey)));

    return record;
  }

  // Reported by the browser that claimed the run, while the run is still its
  // to work on: one statement checks that and writes, so a run closed or a
  // browser unpaired in between cannot slip an event into somebody's history.
  //
  // The browser retries a report whose answer it lost, and names the event so
  // the retry is recognised: the same name twice records one event, and the
  // second call answers with the first, even when the run has closed since.
  async appendEvent(
    jobId: string,
    deviceId: string,
    event: ReportedEvent,
  ): Promise<GroceryJobEvent | undefined> {
    const { kind, eventId, ...details } = event;
    const newId =
      eventId === undefined ? sql<string>`gen_random_uuid()` : sql<string>`${eventId}::uuid`;
    const records = await this.database
      .insert(groceryJobEvent)
      .select(
        this.database
          .select({
            id: newId.as('id'),
            jobId: groceryJob.id,
            kind: sql<GroceryJobEventKind>`${kind}::text`.as('kind'),
            payload: sql<JobEventDetails>`${JSON.stringify(details)}::jsonb`.as('payload'),
            at: sql<Date>`now()`.as('at'),
          })
          .from(groceryJob)
          .where(
            and(
              eq(groceryJob.id, jobId),
              eq(groceryJob.deviceId, deviceId),
              eq(groceryJob.status, GroceryJobStatus.RUNNING),
            ),
          ),
      )
      .onConflictDoNothing({ target: groceryJobEvent.id })
      .returning();

    if (records.length > 0) {
      return this.toEvent(insertedRow(records));
    }

    return eventId === undefined ? undefined : this.recordedEvent(jobId, deviceId, eventId);
  }

  private async recordedEvent(
    jobId: string,
    deviceId: string,
    eventId: string,
  ): Promise<GroceryJobEvent | undefined> {
    const [record] = await this.database
      .select({ event: groceryJobEvent })
      .from(groceryJobEvent)
      .innerJoin(groceryJob, eq(groceryJob.id, groceryJobEvent.jobId))
      .where(
        and(
          eq(groceryJobEvent.id, eventId),
          eq(groceryJobEvent.jobId, jobId),
          eq(groceryJob.deviceId, deviceId),
        ),
      );

    return record === undefined ? undefined : this.toEvent(record.event);
  }

  // Only a run being worked on can be closed. A second close, which the browser
  // sends when it retries after losing the answer to the first, finds the run
  // already closed and gets it back as it was stored, never rewritten.
  //
  // What closing entails (`whenClosing`) shares the transaction of the status
  // change, and goes first: if it fails the run is still RUNNING and the retry
  // does it all again; if the run turns out to be closed already, it is undone.
  async finish(
    jobId: string,
    deviceId: string,
    closing: JobClosing,
    whenClosing?: (executor: DatabaseExecutor) => Promise<void>,
  ): Promise<ClosedJob | undefined> {
    const ownedByDevice = and(eq(groceryJob.id, jobId), eq(groceryJob.deviceId, deviceId));
    const closed = await this.closeWhileRunning(ownedByDevice, closing, whenClosing);

    const [record] =
      closed === undefined
        ? await this.database.select().from(groceryJob).where(ownedByDevice)
        : [closed];
    if (record === undefined) {
      return undefined;
    }

    const job = this.toJob(record, await this.eventsOf(record.id));

    return { job, justClosed: closed !== undefined };
  }

  private async closeWhileRunning(
    ownedByDevice: SQL | undefined,
    closing: JobClosing,
    whenClosing: ((executor: DatabaseExecutor) => Promise<void>) | undefined,
  ): Promise<JobRecord | undefined> {
    try {
      return await this.database.transaction(async (transaction): Promise<JobRecord> => {
        await whenClosing?.(transaction);
        const [closed] = await transaction
          .update(groceryJob)
          .set({
            status: closing.status,
            finishedAt: new Date(),
            productsCents: closing.productsCents ?? null,
            deliveryFeesCents: closing.deliveryFeesCents ?? null,
            shortOfMinimumCents: closing.shortOfMinimumCents ?? null,
          })
          .where(and(ownedByDevice, eq(groceryJob.status, GroceryJobStatus.RUNNING)))
          .returning();
        if (closed === undefined) {
          throw new AlreadyClosed();
        }

        return closed;
      });
    } catch (error) {
      if (error instanceof AlreadyClosed) {
        return undefined;
      }
      throw error;
    }
  }

  private async eventsOf(jobId: string): Promise<GroceryJobEvent[]> {
    const records = await this.database
      .select()
      .from(groceryJobEvent)
      .where(eq(groceryJobEvent.jobId, jobId))
      .orderBy(groceryJobEvent.at, groceryJobEvent.id);

    return records.map((record): GroceryJobEvent => this.toEvent(record));
  }

  private toJob(record: JobRecord, events: GroceryJobEvent[]): GroceryJob {
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

  private toEvent(record: EventRecord): GroceryJobEvent {
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
