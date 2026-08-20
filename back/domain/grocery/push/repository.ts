import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { groceryPushSubscription } from './schema';
import { PushTarget } from './type';

@Injectable()
export class GroceryPushRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async forUser(userId: string): Promise<PushTarget[]> {
    const records = await this.database
      .select()
      .from(groceryPushSubscription)
      .where(eq(groceryPushSubscription.userId, userId));

    return records.map((record): PushTarget => ({
      endpoint: record.endpoint,
      keys: { p256dh: record.p256dh, auth: record.auth },
    }));
  }

  // A browser re-subscribes with the same endpoint after a restart, and may
  // well belong to somebody else by then on a shared machine: the row is taken
  // over rather than duplicated.
  async subscribe(userId: string, target: PushTarget): Promise<void> {
    await this.database
      .insert(groceryPushSubscription)
      .values({
        userId,
        endpoint: target.endpoint,
        p256dh: target.keys.p256dh,
        auth: target.keys.auth,
      })
      .onConflictDoUpdate({
        target: groceryPushSubscription.endpoint,
        set: {
          userId: sql`excluded.user_id`,
          p256dh: sql`excluded.p256dh`,
          auth: sql`excluded.auth`,
        },
      });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    const removed = await this.database
      .delete(groceryPushSubscription)
      .where(
        and(
          eq(groceryPushSubscription.userId, userId),
          eq(groceryPushSubscription.endpoint, endpoint),
        ),
      )
      .returning({ id: groceryPushSubscription.id });

    return removed.length > 0;
  }

  // A push service answers 404 or 410 once a subscription is dead. Keeping it
  // would mean retrying forever against a browser that no longer exists.
  async forget(endpoint: string): Promise<void> {
    await this.database
      .delete(groceryPushSubscription)
      .where(eq(groceryPushSubscription.endpoint, endpoint));
  }
}
