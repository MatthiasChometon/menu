import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { MeasurementsMapper } from './measurements.mapper';
import { profile } from './schema';
import { Measurements } from './type';

@Injectable()
export class ProfileRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly measurements: MeasurementsMapper,
  ) {}

  async save(userId: string, measurements: Measurements): Promise<Measurements> {
    const [record] = await this.database
      .insert(profile)
      .values({ userId, ...measurements, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: profile.userId,
        set: { ...measurements, updatedAt: new Date() },
      })
      .returning();

    return this.measurements.fromRow(record);
  }

  async findByUserId(userId: string): Promise<Measurements | undefined> {
    const [record] = await this.database.select().from(profile).where(eq(profile.userId, userId));

    return record === undefined ? undefined : this.measurements.fromRow(record);
  }
}

