import { SlotWindow } from '../engine/slot';
import { PlannedLine, ReportedEvent } from '../engine/type';

export type JobOutcome = {
  outcome: string;
  productsCents?: number;
  deliveryFeesCents?: number;
  shortOfMinimumCents?: number;
  /** Foods that never made it into the basket, so the cupboard does not count them. */
  missingFoodIds?: string[];
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export type QueuedJob = {
  id: string;
  weekOf: string;
  lines: PlannedLine[];
  slotWindows: SlotWindow[];
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

  async finish(jobId: string, report: JobOutcome): Promise<void> {
    await this.send(FINISH, { jobId, input: report });
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
