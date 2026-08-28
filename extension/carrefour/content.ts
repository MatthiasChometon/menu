import { BasketFiller } from '../engine/fill';
import { SlotWindow } from '../engine/slot';
import { FillResult, PlannedLine, ReportedEvent } from '../engine/type';
import { CarrefourClient } from './client';

// The extension namespace, inlined rather than imported from ../browser: a
// content script cannot pull in a shared chunk — Chrome will not inject an
// ES-module content script — so its one dependency has to live in the file.
// See ../browser for why `browser` is preferred over `chrome`.
const api: typeof chrome =
  (globalThis as unknown as { browser?: typeof chrome }).browser ?? chrome;

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
    await api.runtime.sendMessage(message);
  });
};

// Whenever a Carrefour page is open, tell the background whether it is signed
// in, so the order page can show the state without the reader opening the shop.
void new CarrefourClient()
  .session()
  .then(
    (session): Promise<unknown> =>
      api.runtime.sendMessage({ kind: 'carrefour-session', signedIn: session.signedIn }),
  )
  .catch((): void => {});

api.runtime.onMessage.addListener(
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
          sightings: [],
        });
        console.error('[menu] basket run failed', error);
      });

    // Keeps the channel open: the reply comes long after this returns.
    return true;
  },
);
