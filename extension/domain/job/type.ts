import type { PlannedLine, Sighting, SlotWindow } from '../carrefour/type';

export type QueuedJob = {
  id: string;
  weekOf: string;
  lines: PlannedLine[];
  slotWindows: SlotWindow[];
};

export type JobOutcome = {
  outcome: string;
  productsCents?: number;
  deliveryFeesCents?: number;
  shortOfMinimumCents?: number;
  /** Foods that never made it into the basket, so the cupboard does not count them. */
  missingFoodIds?: string[];
  /** Prices and, for substitutes, sizes seen on the shelves today. */
  observations?: Sighting[];
};
