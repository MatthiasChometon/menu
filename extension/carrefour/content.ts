import { BasketFiller } from '../engine/fill';
import { SlotWindow } from '../engine/slot';
import { FillResult, PlannedLine, ReportedEvent } from '../engine/type';
import { CarrefourClient } from './client';

type FillRequest = {
  kind: 'fill';
  lines: PlannedLine[];
  windows: SlotWindow[];
};

type ProgressMessage = {
  kind: 'progress';
  event: ReportedEvent;
};

// The engine runs here rather than in the service worker because this is the
// only context where the shop's own cookies travel with a request.
const run = async (lines: PlannedLine[], windows: SlotWindow[]): Promise<FillResult> => {
  const filler = new BasketFiller(new CarrefourClient());

  return filler.run(lines, windows, async (event: ReportedEvent): Promise<void> => {
    const message: ProgressMessage = { kind: 'progress', event };
    await chrome.runtime.sendMessage(message);
  });
};

chrome.runtime.onMessage.addListener(
  (request: FillRequest, _sender, respond: (result: FillResult) => void): boolean => {
    if (request.kind !== 'fill') {
      return false;
    }

    run(request.lines, request.windows ?? [])
      .then(respond)
      .catch((error: unknown): void => {
        respond({
          outcome: 'FAILED',
          productsAmount: 0,
          deliveryFees: 0,
          shortOfMinimum: 0,
          missing: [],
        });
        console.error('[menu] basket run failed', error);
      });

    // Keeps the channel open: the reply comes long after this returns.
    return true;
  },
);
