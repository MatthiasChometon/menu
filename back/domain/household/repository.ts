import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { MeasurementsMapper } from '../profile/measurements.mapper';
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
  async add(ownerId: string, member: Omit<MemberRecord, 'id'>): Promise<MemberRecord> {
    const [record] = await this.database
      .insert(householdMember)
      .values({ id: randomUUID(), ownerId, ...member })
      .returning();

    return this.toMember(record);
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

  async countByOwner(ownerId: string): Promise<number> {
    const [row] = await this.database
      .select({ total: count() })
      .from(householdMember)
      .where(eq(householdMember.ownerId, ownerId));

    return row?.total ?? 0;
  }

  private toMember(record: typeof householdMember.$inferSelect): MemberRecord {
    return { id: record.id, name: record.name, ...this.measurements.fromRow(record) };
  }
}
