import { BasketLine } from '../basket/type';
import { ObservedSighting } from '../catalog/type';
import { GroceryJobEventKind, GroceryJobStatus } from '../enum';

export type JobEventDetails = {
  foodId?: string;
  label?: string;
  detail?: string;
};

export type ReportedEvent = JobEventDetails & {
  kind: GroceryJobEventKind;
};

export type JobReport = {
  productsCents?: number;
  deliveryFeesCents?: number;
  shortOfMinimumCents?: number;
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
  alertThresholdCents?: number;
  lines: BasketLine[];
};
