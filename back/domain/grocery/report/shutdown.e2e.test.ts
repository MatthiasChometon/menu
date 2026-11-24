import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BackgroundTasks } from '../../../infrastructure/background/service';
import { startTestApp, type TestApp } from '../../../infrastructure/testing/e2e-app';
import { UserRepository } from '../../user/repository';
import { GroceryJobStatus } from '../enum';
import { GroceryJob } from '../job/model';
import { GroceryReportNotifier } from './notifier';

// A stand-in for work that is slower than the shutdown itself: Nest runs the
// destroy hooks (database pool) within a few milliseconds of close().
const slowerThanShutdown = (): Promise<void> => new Promise((done) => setTimeout(done, 150));

let api: TestApp;

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
  await api.reset();
});

afterAll(async (): Promise<void> => {
  // Already closed by the tests; closing twice is harmless.
  await api.close().catch((): void => undefined);
});

describe('stopping the server', () => {
  it('lets a grocery report still on its way reach the mail', async () => {
    await api.signUp('shutdown@example.com', 'a-long-enough-password');
    const users = api.resolve(UserRepository);
    const account = await users.findRecordById(
      (await users.findRecordByEmail('shutdown@example.com'))?.id ?? '',
    );
    const realFind = users.findById.bind(users);
    // The report starts by reading the account: hold that read until the
    // server is already shutting down.
    vi.spyOn(users, 'findById').mockImplementation(async (id) => {
      await slowerThanShutdown();

      return realFind(id);
    });
    const job = Object.assign(new GroceryJob(), {
      id: 'job',
      weekOf: '2026-08-10',
      status: GroceryJobStatus.SUCCEEDED,
      overThreshold: false,
      events: [],
      lines: [],
      slotWindows: [],
    });
    const before = api.mails().length;

    api.resolve(GroceryReportNotifier).tell(account?.id ?? '', job);
    await api.close();

    expect(api.mails().length).toBe(before + 1);
    expect(api.mails().at(-1)?.to).toBe('shutdown@example.com');
  });
});

describe('background work at shutdown', () => {
  it('still finds the database when it ends', async () => {
    const app = await startTestApp();
    const finished: string[] = [];
    app.resolve(BackgroundTasks).run('late query', async (): Promise<void> => {
      await slowerThanShutdown();
      await app.database().execute(sql`select 1`);
      finished.push('queried');
    });

    await app.close();

    expect(finished).toEqual(['queried']);
  });
});
