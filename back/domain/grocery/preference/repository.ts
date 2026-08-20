import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { groceryPreference } from './schema';
import { defaultPreference } from './utils';

@Injectable()
export class GroceryPreferenceRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // Someone who has never opened the settings still gets warned: the default
  // is a value, not the absence of one.
  async forUser(userId: string): Promise<{ alertThresholdCents?: number }> {
    const [record] = await this.database
      .select()
      .from(groceryPreference)
      .where(eq(groceryPreference.userId, userId));

    if (record === undefined) {
      return { alertThresholdCents: defaultPreference().alertThresholdCents };
    }

    return { alertThresholdCents: record.alertThresholdCents ?? undefined };
  }

  async save(userId: string, alertThresholdCents: number | undefined): Promise<void> {
    await this.database
      .insert(groceryPreference)
      .values({ userId, alertThresholdCents: alertThresholdCents ?? null, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: groceryPreference.userId,
        set: {
          alertThresholdCents: sql`excluded.alert_threshold_cents`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
}
