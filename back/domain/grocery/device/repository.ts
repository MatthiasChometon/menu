import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { GroceryDevice } from './model';
import { groceryDevice } from './schema';

@Injectable()
export class GroceryDeviceRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async pair(userId: string, label: string, tokenHash: string): Promise<GroceryDevice> {
    const [record] = await this.database
      .insert(groceryDevice)
      .values({ userId, label, tokenHash })
      .returning();

    return this.toDevice(record);
  }

  async findByTokenHash(tokenHash: string): Promise<{ id: string; userId: string } | undefined> {
    const [record] = await this.database
      .select({ id: groceryDevice.id, userId: groceryDevice.userId })
      .from(groceryDevice)
      .where(eq(groceryDevice.tokenHash, tokenHash));

    return record;
  }

  async listByUser(userId: string): Promise<GroceryDevice[]> {
    const records = await this.database
      .select()
      .from(groceryDevice)
      .where(eq(groceryDevice.userId, userId))
      .orderBy(groceryDevice.pairedAt, groceryDevice.id);

    return records.map((record) => this.toDevice(record));
  }

  async unpair(userId: string, deviceId: string): Promise<boolean> {
    const removed = await this.database
      .delete(groceryDevice)
      .where(and(eq(groceryDevice.id, deviceId), eq(groceryDevice.userId, userId)))
      .returning({ id: groceryDevice.id });

    return removed.length > 0;
  }

  async markSeen(deviceId: string): Promise<void> {
    await this.database
      .update(groceryDevice)
      .set({ lastSeenAt: new Date() })
      .where(eq(groceryDevice.id, deviceId));
  }

  async reportCarrefourSession(deviceId: string, signedIn: boolean): Promise<void> {
    await this.database
      .update(groceryDevice)
      .set({ carrefourSignedIn: signedIn, carrefourCheckedAt: new Date() })
      .where(eq(groceryDevice.id, deviceId));
  }

  private toDevice(record: typeof groceryDevice.$inferSelect): GroceryDevice {
    return {
      id: record.id,
      label: record.label,
      pairedAt: record.pairedAt,
      lastSeenAt: record.lastSeenAt ?? undefined,
      carrefourSignedIn: record.carrefourSignedIn ?? undefined,
      carrefourCheckedAt: record.carrefourCheckedAt ?? undefined,
    };
  }
}
