import { GroceryJobEventKind } from '../enum';

export type JobEventDetails = {
  foodId?: string;
  label?: string;
  detail?: string;
};

export type ReportedEvent = JobEventDetails & {
  kind: GroceryJobEventKind;
};
