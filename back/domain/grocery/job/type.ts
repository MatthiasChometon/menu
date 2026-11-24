import { BasketLine } from '../basket/type';
import { ObservedSighting } from '../catalog/type';
import { GroceryJobEventKind, GroceryJobStatus } from '../enum';
import { GroceryJob } from './model';
import type { groceryJob, groceryJobEvent } from './schema';

export type JobEventDetails = {
  foodId?: string | undefined;
  label?: string | undefined;
  detail?: string | undefined;
};

export type ReportedEvent = JobEventDetails & {
  kind: GroceryJobEventKind;
};

export type JobReport = {
  productsCents?: number | undefined;
  deliveryFeesCents?: number | undefined;
  shortOfMinimumCents?: number | undefined;
};

/** How a run ended, as far as the run itself is concerned. */
export type JobClosing = JobReport & { status: GroceryJobStatus };

/** Everything needed to close a run: who closes it and what it found. */
export type JobClosure = {
  jobId: string;
  deviceId: string;
  userId: string;
  status: GroceryJobStatus;
  report: JobReport;
  missingFoodIds: string[];
  observations: ObservedSighting[];
};

export type NewJob = {
  userId: string;
  weekOf: string;
  alertThresholdCents?: number | undefined;
  lines: BasketLine[];
};

export type JobRecord = typeof groceryJob.$inferSelect;

export type EventRecord = typeof groceryJobEvent.$inferSelect;

/** The run as stored, and whether this very call is the one that closed it. */
export type ClosedJob = { job: GroceryJob; justClosed: boolean };
