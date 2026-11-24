import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { insertedRow } from '../../infrastructure/database/rows';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { MeasurementsMapper } from '../profile/measurements.mapper';
import { user } from '../user/schema';
import { householdMember } from './schema';
import { MemberRecord } from './type';

@Injectable()
export class HouseholdRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly measurements: MeasurementsMapper,
  ) {}

  // The identifier is made here rather than by the database: the server runs on
  // PostgreSQL 9.6, which has neither pgcrypto nor gen_random_uuid().
  //
  // Counted and inserted under a lock on the owner, so two adds sent together
  // cannot both see room for one more: nothing comes back when the household is
  // already full.
  async addUnlessFull(
    ownerId: string,
    member: Omit<MemberRecord, 'id'>,
    maxMembers: number,
  ): Promise<MemberRecord | undefined> {
    return this.database.transaction(async (transaction): Promise<MemberRecord | undefined> => {
      await transaction
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, ownerId))
        .for('update');
      const [current] = await transaction
        .select({ total: count() })
        .from(householdMember)
        .where(eq(householdMember.ownerId, ownerId));
      if ((current?.total ?? 0) >= maxMembers) return undefined;

      const records = await transaction
        .insert(householdMember)
        .values({ id: randomUUID(), ownerId, ...member })
        .returning();

      return this.toMember(insertedRow(records));
    });
  }

  // The owner is part of the condition, not checked afterwards: a member id
  // guessed from somewhere else must not match a row belonging to anybody but
  // the caller, and the surest way to guarantee that is to never select it.
  async update(
    ownerId: string,
    id: string,
    member: Omit<MemberRecord, 'id'>,
  ): Promise<MemberRecord | undefined> {
    const [record] = await this.database
      .update(householdMember)
      .set(member)
      .where(and(eq(householdMember.ownerId, ownerId), eq(householdMember.id, id)))
      .returning();

    return record === undefined ? undefined : this.toMember(record);
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const removed = await this.database
      .delete(householdMember)
      .where(and(eq(householdMember.ownerId, ownerId), eq(householdMember.id, id)))
      .returning({ id: householdMember.id });

    return removed.length > 0;
  }

  // Ordered by when they were added, tie-broken on the identifier: without it
  // an edited row comes back in a different place and the list appears to
  // shuffle itself every time somebody is corrected.
  async findByOwner(ownerId: string): Promise<MemberRecord[]> {
    const records = await this.database
      .select()
      .from(householdMember)
      .where(eq(householdMember.ownerId, ownerId))
      .orderBy(householdMember.createdAt, householdMember.id);

    return records.map((record): MemberRecord => this.toMember(record));
  }

  private toMember(record: typeof householdMember.$inferSelect): MemberRecord {
    return { id: record.id, name: record.name, ...this.measurements.fromRow(record) };
  }
}
