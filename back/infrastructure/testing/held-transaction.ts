import type { Database, DatabaseExecutor } from '../database/token';

export type HeldTransaction = {
  /** Commits what the transaction did and lets go of its locks. */
  release: () => Promise<void>;
};

/**
 * Runs `work` in a transaction that stays open, with its locks and uncommitted
 * rows, until `release` is called. The caller then starts the operation under
 * test and knows it meets that state: no ordering left to chance.
 */
export const holdTransaction = async (
  database: Database,
  work: (transaction: DatabaseExecutor) => Promise<void>,
): Promise<HeldTransaction> => {
  let open: () => void = () => undefined;
  const gate = new Promise<void>((resolve): void => {
    open = resolve;
  });
  let ready: () => void = () => undefined;
  const isReady = new Promise<void>((resolve): void => {
    ready = resolve;
  });

  const transaction = database.transaction(async (executor): Promise<void> => {
    await work(executor);
    ready();
    await gate;
  });
  // A failing `work` must surface instead of hanging the wait below.
  await Promise.race([isReady, transaction]);

  return {
    release: async (): Promise<void> => {
      open();
      await transaction;
    },
  };
};

/** Whether `pending` is still waiting after a short while, i.e. blocked. */
export const staysPending = async (pending: Promise<unknown>, waitMs = 400): Promise<boolean> => {
  const settled = pending.then(
    (): string => 'settled',
    (): string => 'settled',
  );
  const verdict = await Promise.race([
    settled,
    new Promise<string>((resolve): void => {
      setTimeout(() => resolve('pending'), waitMs);
    }),
  ]);

  return verdict === 'pending';
};
