import { describe, expect, it } from 'vitest';
import type { RetryOptions } from '../../infrastructure/retry/retry';
import { createMenuClient } from './client';

const JOB = { id: 'job-1', weekOf: '2026-08-24', lines: [], slotWindows: [] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const bodyOf = (init: RequestInit | undefined): string =>
  typeof init?.body === 'string' ? init.body : '';

type Sent = { query: string; variables: Record<string, unknown> };
type Step = number | Error | object;

// A menu API that answers the given steps in order, then an empty success.
const clientOn = (steps: Step[]): ReturnType<typeof createMenuClient> & { sent: Sent[] } => {
  const sent: Sent[] = [];
  let call = 0;
  const retry: Partial<RetryOptions> = {
    sleep: (): Promise<void> => Promise.resolve(),
    fetch: (_input, init): Promise<Response> => {
      sent.push(JSON.parse(bodyOf(init)) as Sent);
      const step = steps[call] ?? { data: {} };
      call += 1;
      if (step instanceof Error) return Promise.reject(step);
      if (typeof step === 'number') return Promise.resolve(new Response('', { status: step }));

      return Promise.resolve(Response.json(step));
    },
  };

  return { ...createMenuClient('https://api.test/graphql', 'token', retry), sent };
};

describe('claiming a run', () => {
  it('sends the same key again when the first answer is lost', async () => {
    const client = clientOn([new TypeError('network'), 503, { data: { claimGroceryJob: JOB } }]);

    const job = await client.claim();

    expect(job?.id).toBe('job-1');
    expect(client.sent).toHaveLength(3);
    const keys = client.sent.map((call): unknown => call.variables.claimKey);
    expect(keys[0]).toMatch(UUID);
    expect(new Set(keys).size).toBe(1);
  });

  it('uses a new key for the next claim', async () => {
    const client = clientOn([]);

    await client.claim();
    await client.claim();

    expect(client.sent[0]?.variables.claimKey).not.toBe(client.sent[1]?.variables.claimKey);
  });

  it('has nothing to do when no run is waiting', async () => {
    const client = clientOn([{ data: { claimGroceryJob: null } }]);

    await expect(client.claim()).resolves.toBeUndefined();
  });

  it('refuses an answer that is not a run', async () => {
    const client = clientOn([{ data: { claimGroceryJob: { id: 3 } } }]);

    await expect(client.claim()).rejects.toThrow('not one');
  });
});

describe('reporting an event', () => {
  it('names the event, and keeps the name across a retry', async () => {
    const client = clientOn([503]);

    await client.report('job-1', { kind: 'LINE_ADDED', foodId: 'rice' } as never);

    const names = client.sent.map(
      (call): unknown => (call.variables.input as { eventId: unknown }).eventId,
    );
    expect(client.sent).toHaveLength(2);
    expect(names[0]).toMatch(UUID);
    expect(names[1]).toBe(names[0]);
  });
});

describe('finishing a run', () => {
  it('is sent again after a lost answer', async () => {
    const client = clientOn([new TypeError('network')]);

    await client.finish('job-1', { outcome: 'FAILED' });

    expect(client.sent).toHaveLength(2);
  });
});

describe('answers that are not a success', () => {
  it('reports the errors the menu lists', async () => {
    const client = clientOn([{ errors: [{ message: 'Not found' }, { message: 'again' }] }]);

    await expect(client.finish('job-1', { outcome: 'FAILED' })).rejects.toThrow('Not found; again');
  });

  it('fails on a refusal that is not JSON', async () => {
    const client = clientOn([403]);

    await expect(client.finish('job-1', { outcome: 'FAILED' })).rejects.toThrow('403');
  });

  it('fails on an answer without data', async () => {
    const client = clientOn([{}]);

    await expect(client.claim()).rejects.toThrow('no data');
  });
});
