import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';
import { profile } from './schema';
import { Measurements } from './type';

@Injectable()
export class ProfileRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async save(userId: string, measurements: Measurements): Promise<Measurements> {
    const [record] = await this.database
      .insert(profile)
      .values({ userId, ...measurements, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: profile.userId,
        set: { ...measurements, updatedAt: new Date() },
      })
      .returning();

    return this.toMeasurements(record);
  }

  async findByUserId(userId: string): Promise<Measurements | undefined> {
    const [record] = await this.database.select().from(profile).where(eq(profile.userId, userId));

    return record === undefined ? undefined : this.toMeasurements(record);
  }

  // The columns are plain text, so the enums are restored explicitly rather
  // than asserted onto the row.
  private toMeasurements(record: typeof profile.$inferSelect): Measurements {
    return {
      sex: Sex[record.sex as keyof typeof Sex],
      age: record.age,
      heightCm: record.heightCm,
      weightKg: record.weightKg,
      dailyActivity: DailyActivity[record.dailyActivity as keyof typeof DailyActivity],
      trainingDaysPerWeek: record.trainingDaysPerWeek,
      trainingType: TrainingType[record.trainingType as keyof typeof TrainingType],
      starchQuality: StarchQuality[record.starchQuality as keyof typeof StarchQuality],
      appetite: Appetite[record.appetite as keyof typeof Appetite],
      goal: Goal[record.goal as keyof typeof Goal],
    };
  }
}
