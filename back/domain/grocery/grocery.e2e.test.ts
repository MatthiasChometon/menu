import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';

const PAIR_DEVICE = `
  mutation ($label: String!) {
    pairGroceryDevice(label: $label) { token device { id label } }
  }
`;

const MY_DEVICES = `query { myGroceryDevices { id label } }`;

const CREATE_JOB = `
  mutation ($input: CreateGroceryJobInput!) {
    createGroceryJob(input: $input) { id weekOf status }
  }
`;

const CLAIM_JOB = `mutation { claimGroceryJob { id weekOf status } }`;

const REPORT_EVENT = `
  mutation ($jobId: ID!, $input: GroceryJobEventInput!) {
    reportGroceryJobEvent(jobId: $jobId, input: $input) { kind foodId label detail }
  }
`;

const FINISH_JOB = `
  mutation ($jobId: ID!, $outcome: GroceryJobOutcome!) {
    finishGroceryJob(jobId: $jobId, outcome: $outcome) { id status }
  }
`;

const JOB = `
  query ($jobId: ID!) {
    groceryJob(jobId: $jobId) { id status events { kind foodId detail } }
  }
`;

type Job = { id: string; weekOf: string; status: string };
type Device = { token: string; device: { id: string; label: string } };

let api: TestApp;

const signIn = async (email: string): Promise<string> => {
  const response = await api.post('/auth/register', {
    email,
    password: 'a-long-enough-password',
  });
  const session = response.cookies.find((cookie): boolean => cookie.name === 'session');

  return `session=${session?.value}`;
};

const pair = async (cookie: string, label: string): Promise<string> => {
  const response = await api.graphql<{ pairGroceryDevice: Device }>(PAIR_DEVICE, { label }, cookie);

  return response.data!.pairGroceryDevice.token;
};

const asDevice = (token: string): Record<string, string> => ({
  'x-grocery-device-token': token,
});

const queueJob = async (cookie: string, weekOf = '2026-08-24'): Promise<Job> => {
  const response = await api.graphql<{ createGroceryJob: Job }>(
    CREATE_JOB,
    { input: { weekOf } },
    cookie,
  );

  return response.data!.createGroceryJob;
};

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('pairing a browser', () => {
  it('hands out a token and lists the browser afterwards', async () => {
    const cookie = await signIn('matthias@example.com');

    const paired = await api.graphql<{ pairGroceryDevice: Device }>(
      PAIR_DEVICE,
      { label: 'Desktop' },
      cookie,
    );
    const listed = await api.graphql<{ myGroceryDevices: { label: string }[] }>(
      MY_DEVICES,
      undefined,
      cookie,
    );

    expect(paired.data?.pairGroceryDevice.token).toEqual(expect.any(String));
    expect(listed.data?.myGroceryDevices).toEqual([expect.objectContaining({ label: 'Desktop' })]);
  });

  it('refuses to pair for a visitor who is not signed in', async () => {
    const response = await api.graphql(PAIR_DEVICE, { label: 'Desktop' });

    expect(response.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
  });
});

describe('running a queued order', () => {
  it('lets a paired browser pick the run up, report on it and close it', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);

    const claimed = await api.graphql<{ claimGroceryJob: Job }>(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice(token),
    );
    await api.graphql(
      REPORT_EVENT,
      {
        jobId: queued.id,
        input: { kind: 'LINE_SUBSTITUTED', foodId: 'wholeMilk', detail: 'out of stock' },
      },
      undefined,
      asDevice(token),
    );
    await api.graphql(
      FINISH_JOB,
      { jobId: queued.id, outcome: 'SUCCEEDED' },
      undefined,
      asDevice(token),
    );

    const followed = await api.graphql<{
      groceryJob: { status: string; events: { kind: string; foodId?: string }[] };
    }>(JOB, { jobId: queued.id }, cookie);

    expect(queued.status).toBe('PENDING');
    expect(claimed.data?.claimGroceryJob).toEqual(
      expect.objectContaining({ id: queued.id, status: 'RUNNING' }),
    );
    expect(followed.data?.groceryJob.status).toBe('SUCCEEDED');
    expect(followed.data?.groceryJob.events).toEqual([
      expect.objectContaining({ kind: 'LINE_SUBSTITUTED', foodId: 'wholeMilk' }),
    ]);
  });

  it('has nothing to hand out when no run is waiting', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');

    const claimed = await api.graphql<{ claimGroceryJob: Job | null }>(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice(token),
    );

    expect(claimed.data?.claimGroceryJob).toBeNull();
  });

  it('gives the same run to only one browser', async () => {
    const cookie = await signIn('matthias@example.com');
    const [first, second] = [await pair(cookie, 'Desktop'), await pair(cookie, 'Laptop')];
    await queueJob(cookie);

    const claims = await Promise.all([
      api.graphql<{ claimGroceryJob: Job | null }>(
        CLAIM_JOB,
        undefined,
        undefined,
        asDevice(first),
      ),
      api.graphql<{ claimGroceryJob: Job | null }>(
        CLAIM_JOB,
        undefined,
        undefined,
        asDevice(second),
      ),
    ]);

    const handedOut = claims.filter((claim): boolean => claim.data?.claimGroceryJob != null);
    expect(handedOut).toHaveLength(1);
  });
});

describe('keeping accounts apart', () => {
  it('never hands one account a run queued by another', async () => {
    const mine = await signIn('matthias@example.com');
    const theirs = await signIn('someone-else@example.com');
    const theirToken = await pair(theirs, 'Their desktop');
    await queueJob(mine);

    const claimed = await api.graphql<{ claimGroceryJob: Job | null }>(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice(theirToken),
    );

    expect(claimed.data?.claimGroceryJob).toBeNull();
  });

  it('refuses to write into a run the browser does not hold', async () => {
    const mine = await signIn('matthias@example.com');
    const theirs = await signIn('someone-else@example.com');
    const theirToken = await pair(theirs, 'Their desktop');
    const queued = await queueJob(mine);

    const reported = await api.graphql(
      REPORT_EVENT,
      { jobId: queued.id, input: { kind: 'LINE_ADDED', foodId: 'brownRice' } },
      undefined,
      asDevice(theirToken),
    );
    const followed = await api.graphql<{ groceryJob: { events: unknown[] } }>(
      JOB,
      { jobId: queued.id },
      mine,
    );

    expect(reported.errors?.[0].message).toBeDefined();
    expect(followed.data?.groceryJob.events).toEqual([]);
  });

  it('shows nothing when asked for a run belonging to someone else', async () => {
    const mine = await signIn('matthias@example.com');
    const theirs = await signIn('someone-else@example.com');
    const queued = await queueJob(mine);

    const response = await api.graphql<{ groceryJob: unknown }>(JOB, { jobId: queued.id }, theirs);

    expect(response.data?.groceryJob).toBeNull();
  });

  it('turns away a token that was never issued', async () => {
    const response = await api.graphql(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice('not-a-real-token'),
    );

    expect(response.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
  });
});
