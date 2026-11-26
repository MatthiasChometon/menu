import { eq } from 'drizzle-orm';
import { countedRow } from '../../infrastructure/database/rows';
import type { Database, DatabaseExecutor } from '../../infrastructure/database/token';
import { user } from './schema';

type CappedInsert<Row> = {
  ownerId: string;
  maxItems: number;
  /** The owner's current number of rows, read inside the lock. */
  countOwned: (transaction: DatabaseExecutor) => Promise<{ total: number }[]>;
  /** The insert ... returning, run only when there is room. */
  insert: (transaction: DatabaseExecutor) => Promise<Row[]>;
};

// Counted and inserted under a lock on the owner, so two adds sent together
// cannot both see room for one more: nothing comes back when the owner is
// already at the cap.
export const insertUnlessFull = async <Row>(
  database: Database,
  { ownerId, maxItems, countOwned, insert }: CappedInsert<Row>,
): Promise<Row[] | undefined> =>
  database.transaction(async (transaction): Promise<Row[] | undefined> => {
    await transaction.select({ id: user.id }).from(user).where(eq(user.id, ownerId)).for('update');
    if (countedRow(await countOwned(transaction)) >= maxItems) return undefined;

    return insert(transaction);
  });
