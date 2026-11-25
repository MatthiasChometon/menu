import { fetchWithRetry, type RetryOptions } from '../../infrastructure/retry/retry';
import type { ReportedEvent } from '../carrefour/type';
import type { JobOutcome, QueuedJob } from './type';

const CLAIM = `
  mutation ($claimKey: ID!) {
    claimGroceryJob(claimKey: $claimKey) {
      id
      weekOf
      lines { foodId label grams fromPantry ean productName unitSize units }
      slotWindows { weekday startMinute endMinute }
    }
  }
`;

const REPORT = `
  mutation ($jobId: ID!, $input: GroceryJobEventInput!) {
    reportGroceryJobEvent(jobId: $jobId, input: $input) { kind }
  }
`;

const FINISH = `
  mutation ($jobId: ID!, $input: GroceryJobOutcomeInput!) {
    finishGroceryJob(jobId: $jobId, input: $input) { id status }
  }
`;

const CARREFOUR_SESSION = `
  mutation ($signedIn: Boolean!) {
    reportCarrefourSession(signedIn: $signedIn)
  }
`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const messageOf = (error: unknown): string =>
  isRecord(error) && typeof error.message === 'string' ? error.message : 'unknown error';

// The top level of a run is checked; its lines and windows come from our own
// API, behind the device token.
const isQueuedJob = (value: unknown): value is QueuedJob =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.weekOf === 'string' &&
  Array.isArray(value.lines) &&
  Array.isArray(value.slotWindows);

// The data of a GraphQL answer, or the reason it is not one.
const dataOf = async (response: Response): Promise<Record<string, unknown>> => {
  const body: unknown = await response.json().catch((): undefined => undefined);

  if (isRecord(body) && Array.isArray(body.errors)) {
    throw new Error(body.errors.map(messageOf).join('; '));
  }
  if (!response.ok) throw new Error(`The menu answered ${response.status}`);
  if (!isRecord(body) || !isRecord(body.data)) throw new Error('The menu sent no data');

  return body.data;
};

// The extension's link to the menu API: it claims a queued grocery job, reports
// progress as it fills the basket, and finishes it with what the shop charged.
//
// Every call can be sent again after a lost answer, so all go through the retry
// helper: claim and report carry a key chosen here and checked by the server
// (the same key returns what the first call did), finish is guarded by the
// state of the run (a second close returns the run as stored), and the session
// report sets a flag.
export const createMenuClient = (
  endpoint: string,
  deviceToken: string,
  retry: Partial<RetryOptions> = {},
): {
  claim: () => Promise<QueuedJob | undefined>;
  report: (jobId: string, event: ReportedEvent) => Promise<void>;
  finish: (jobId: string, report: JobOutcome) => Promise<void>;
  reportCarrefourSession: (signedIn: boolean) => Promise<void>;
} => {
  const send = async (query: string, variables?: object): Promise<Record<string, unknown>> => {
    const response = await fetchWithRetry(
      endpoint,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-grocery-device-token': deviceToken },
        body: JSON.stringify({ query, variables }),
      },
      retry,
    );

    return dataOf(response);
  };

  return {
    claim: async (): Promise<QueuedJob | undefined> => {
      const data = await send(CLAIM, { claimKey: crypto.randomUUID() });
      const job = data.claimGroceryJob;
      if (job === null || job === undefined) return undefined;
      if (!isQueuedJob(job)) throw new Error('The menu sent a run that is not one');

      return job;
    },
    report: async (jobId: string, event: ReportedEvent): Promise<void> => {
      await send(REPORT, { jobId, input: { ...event, eventId: crypto.randomUUID() } });
    },
    finish: async (jobId: string, report: JobOutcome): Promise<void> => {
      await send(FINISH, { jobId, input: report });
    },
    reportCarrefourSession: async (signedIn: boolean): Promise<void> => {
      await send(CARREFOUR_SESSION, { signedIn });
    },
  };
};

export type MenuClient = ReturnType<typeof createMenuClient>;
