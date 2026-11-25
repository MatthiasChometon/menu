import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FillResult } from '../carrefour/type';
import { createGroceryWorker } from './worker';

type Listener = (message: unknown) => void;
const bodyOf = (init: RequestInit | undefined): string =>
  typeof init?.body === 'string' ? init.body : '';

type Request = { query: string; variables: Record<string, unknown> };

const FILLED: FillResult = {
  outcome: 'SUCCEEDED',
  productsAmount: 84.5,
  deliveryFees: 7.9,
  shortOfMinimum: 0,
  missing: [],
  sightings: [],
};

const NO_WAIT = { sleep: (): Promise<void> => Promise.resolve() };

let listeners: Set<Listener>;
let notifications: { title: string }[];
let reported: { jobId: string }[];
let finished: { jobId: string; outcome: string }[];
let finishAnswer: () => Response;
let claims: number;

const answer = (request: Request): Response => {
  if (request.query.includes('claimGroceryJob')) {
    claims += 1;
    return Response.json({
      data: { claimGroceryJob: { id: `job-${claims}`, weekOf: 'w', lines: [], slotWindows: [] } },
    });
  }
  if (request.query.includes('reportGroceryJobEvent')) {
    reported.push({ jobId: String(request.variables.jobId) });
    return Response.json({ data: { reportGroceryJobEvent: { kind: 'x' } } });
  }
  if (request.query.includes('finishGroceryJob')) {
    const input = request.variables.input as { outcome: string };
    finished.push({ jobId: String(request.variables.jobId), outcome: input.outcome });
    return finishAnswer();
  }

  return Response.json({ data: {} });
};

const stubBrowser = (tab: object): void => {
  vi.stubGlobal('browser', {
    storage: {
      local: {
        get: (): Promise<object> =>
          Promise.resolve({ endpoint: 'https://api.test', deviceToken: 't' }),
      },
    },
    tabs: {
      query: (): Promise<object[]> => Promise.resolve([tab]),
      sendMessage: (): Promise<FillResult> => {
        // The page reports progress while the run is on.
        for (const listener of listeners) {
          listener({ kind: 'progress', event: { kind: 'LINE_ADDED' } });
        }
        return Promise.resolve(FILLED);
      },
    },
    runtime: {
      onMessage: {
        addListener: (listener: Listener): void => {
          listeners.add(listener);
        },
        removeListener: (listener: Listener): void => {
          listeners.delete(listener);
        },
      },
    },
    notifications: {
      create: (_id: unknown, notice: { title: string }): Promise<void> => {
        notifications.push(notice);
        return Promise.resolve();
      },
    },
  });
};

beforeEach(() => {
  listeners = new Set();
  notifications = [];
  reported = [];
  finished = [];
  claims = 0;
  finishAnswer = (): Response => Response.json({ data: { finishGroceryJob: { id: 'x' } } });

  stubBrowser({ id: 7 });
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: RequestInit): Promise<Response> =>
      Promise.resolve(answer(JSON.parse(bodyOf(init)) as Request)),
    ),
  );
  vi.spyOn(console, 'error').mockImplementation((): void => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('a grocery run', () => {
  it('forwards the progress of the run it is working on', async () => {
    await createGroceryWorker(NO_WAIT).runOnce();

    expect(reported).toEqual([{ jobId: 'job-1' }]);
  });

  it('stops listening once the run is over, so the next run is not reported twice', async () => {
    const worker = createGroceryWorker(NO_WAIT);

    await worker.runOnce();
    await worker.runOnce();

    expect(listeners.size).toBe(0);
    expect(reported).toEqual([{ jobId: 'job-1' }, { jobId: 'job-2' }]);
  });

  it('tells the reader the basket is ready even when the menu could not be told', async () => {
    finishAnswer = (): Response => new Response('', { status: 400 });

    await createGroceryWorker(NO_WAIT).runOnce();

    expect(notifications).toHaveLength(1);
  });

  it('closes the run as failed when the shop tab cannot be read', async () => {
    stubBrowser({});

    await createGroceryWorker(NO_WAIT).runOnce();

    expect(finished.map((run): string => run.outcome)).toEqual(['FAILED']);
    expect(notifications).toHaveLength(1);
  });
});
