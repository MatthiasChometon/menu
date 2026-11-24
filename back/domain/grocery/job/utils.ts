import { GroceryJobEventKind } from '../enum';
import { GroceryJobEvent } from './model';

export const jobConstraints = (): {
  foodIdMaxLength: number;
  labelMaxLength: number;
  detailMaxLength: number;
  maxNeedsPerJob: number;
  eanMaxLength: number;
} => ({
  foodIdMaxLength: 60,
  labelMaxLength: 200,
  detailMaxLength: 500,
  maxNeedsPerJob: 200,
  eanMaxLength: 20,
});

// What a person should look at in a report: a line the shop could not supply,
// or one it replaced with something else.
export const shortfallsOf = (events: GroceryJobEvent[]): GroceryJobEvent[] =>
  events.filter(
    (event): boolean =>
      event.kind === GroceryJobEventKind.LINE_MISSING ||
      event.kind === GroceryJobEventKind.LINE_SUBSTITUTED,
  );
