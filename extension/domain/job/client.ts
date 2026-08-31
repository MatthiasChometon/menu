import type { ReportedEvent } from '../carrefour/type';
import type { JobOutcome, QueuedJob } from './type';

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const CLAIM = `
  mutation {
    claimGroceryJob {
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

// The extension's link to the menu API: it claims a queued grocery job, reports
// progress as it fills the basket, and finishes it with what the shop charged.
export const createMenuClient = (
  endpoint: string,
  deviceToken: string,
): {
  claim: () => Promise<QueuedJob | undefined>;
  report: (jobId: string, event: ReportedEvent) => Promise<void>;
  finish: (jobId: string, report: JobOutcome) => Promise<void>;
  reportCarrefourSession: (signedIn: boolean) => Promise<void>;
} => {
  const send = async <T>(query: string, variables?: object): Promise<T | undefined> => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-grocery-device-token': deviceToken },
      body: JSON.stringify({ query, variables }),
    });

    const body = (await response.json()) as GraphqlResponse<T>;
    if (body.errors !== undefined) {
      throw new Error(body.errors.map((error): string => error.message).join('; '));
    }

    return body.data;
  };

  return {
    claim: async (): Promise<QueuedJob | undefined> => {
      const data = await send<{ claimGroceryJob: QueuedJob | null }>(CLAIM);
      return data?.claimGroceryJob ?? undefined;
    },
    report: async (jobId: string, event: ReportedEvent): Promise<void> => {
      await send(REPORT, { jobId, input: event });
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
