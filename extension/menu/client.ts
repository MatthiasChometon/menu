import { PlannedLine, ReportedEvent } from '../engine/type';

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export type QueuedJob = {
  id: string;
  weekOf: string;
  lines: PlannedLine[];
};

const CLAIM = `
  mutation {
    claimGroceryJob {
      id
      weekOf
      lines { foodId grams fromPantry ean productName unitSize units }
    }
  }
`;

const REPORT = `
  mutation ($jobId: ID!, $input: GroceryJobEventInput!) {
    reportGroceryJobEvent(jobId: $jobId, input: $input) { kind }
  }
`;

const FINISH = `
  mutation ($jobId: ID!, $outcome: GroceryJobOutcome!) {
    finishGroceryJob(jobId: $jobId, outcome: $outcome) { id status }
  }
`;

export class MenuClient {
  constructor(
    private readonly endpoint: string,
    private readonly deviceToken: string,
  ) {}

  async claim(): Promise<QueuedJob | undefined> {
    const data = await this.send<{ claimGroceryJob: QueuedJob | null }>(CLAIM);

    return data?.claimGroceryJob ?? undefined;
  }

  async report(jobId: string, event: ReportedEvent): Promise<void> {
    await this.send(REPORT, { jobId, input: event });
  }

  async finish(jobId: string, outcome: string): Promise<void> {
    await this.send(FINISH, { jobId, outcome });
  }

  private async send<T>(query: string, variables?: object): Promise<T | undefined> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-grocery-device-token': this.deviceToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const body = (await response.json()) as GraphqlResponse<T>;
    if (body.errors !== undefined) {
      throw new Error(body.errors.map((error): string => error.message).join('; '));
    }

    return body.data;
  }
}
