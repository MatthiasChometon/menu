import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { MeasurementsInput } from './input';
import { MeasurementsMapper } from './measurements.mapper';
import { profile } from './schema';
import { ProfileRecord } from './type';
import { profileConstraints } from './utils';

@Injectable()
export class ProfileRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly measurements: MeasurementsMapper,
  ) {}

  async save(userId: string, answers: MeasurementsInput): Promise<ProfileRecord> {
    const [record] = await this.database
      .insert(profile)
      .values({ userId, ...answers, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: profile.userId,
        set: { ...answers, updatedAt: new Date() },
      })
      .returning();

    return this.toProfileRecord(record);
  }

  async findByUserId(userId: string): Promise<ProfileRecord | undefined> {
    const [record] = await this.database.select().from(profile).where(eq(profile.userId, userId));

    return record === undefined ? undefined : this.toProfileRecord(record);
  }

  // Adds to whatever nudge is already stored rather than replacing it, so
  // accepting the coach's suggestion twice moves the target twice — clamped so
  // repeated clicks cannot drift the target into an unreasonable range.
  async adjustKcalTarget(userId: string, deltaKcal: number): Promise<ProfileRecord | undefined> {
    const { minKcalAdjustment, maxKcalAdjustment } = profileConstraints();
    const [record] = await this.database
      .update(profile)
      .set({
        kcalAdjustment: sql`greatest(least(${profile.kcalAdjustment} + ${deltaKcal}, ${maxKcalAdjustment}), ${minKcalAdjustment})`,
        updatedAt: new Date(),
      })
      .where(eq(profile.userId, userId))
      .returning();

    return record === undefined ? undefined : this.toProfileRecord(record);
  }

  private toProfileRecord(record: typeof profile.$inferSelect): ProfileRecord {
    return { ...this.measurements.fromRow(record), kcalAdjustmentKcal: record.kcalAdjustment };
  }
}
