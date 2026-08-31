import { createBasketFiller } from './fill';
import { createCarrefourClient } from './client';
import type { FillResult, PlannedLine, ReportedEvent, SlotWindow } from './type';

type FillRequest = { kind: 'fill'; lines: PlannedLine[]; windows: SlotWindow[] };
type ProgressMessage = { kind: 'progress'; event: ReportedEvent };

const failed = (): FillResult => ({
  outcome: 'FAILED',
  productsAmount: 0,
  deliveryFees: 0,
  shortOfMinimum: 0,
  missing: [],
  sightings: [],
});

// Runs inside a carrefour.fr page — the only context where the shop's own cookies
// travel with a request, which is why the engine runs here and not in the service
// worker.
export const startCarrefourContent = (): void => {
  const run = async (lines: PlannedLine[], windows: SlotWindow[]): Promise<FillResult> => {
    const filler = createBasketFiller(createCarrefourClient());

    return filler.run(lines, windows, async (event: ReportedEvent): Promise<void> => {
      const message: ProgressMessage = { kind: 'progress', event };
      await browser.runtime.sendMessage(message);
    });
  };

  // Whenever a Carrefour page is open, tell the background whether it is signed
  // in, so the order page can show the state without the reader opening the shop.
  // And when the reader came here from the menu site's "open Carrefour", carry
  // them back once signed in, so the site can confirm the shop is wired up.
  void createCarrefourClient()
    .session()
    .then(async (session): Promise<void> => {
      await browser.runtime.sendMessage({ kind: 'carrefour-session', signedIn: session.signedIn });
      if (!session.signedIn) return;

      const stored = await browser.storage.local.get('returnUrl');
      if (typeof stored.returnUrl === 'string' && stored.returnUrl !== '') {
        await browser.storage.local.remove('returnUrl');
        location.assign(stored.returnUrl);
      }
    })
    .catch((): void => {});

  browser.runtime.onMessage.addListener(
    (request: FillRequest, _sender, respond: (result: FillResult) => void): boolean => {
      if (request.kind !== 'fill') return false;

      run(request.lines, request.windows ?? [])
        .then(respond)
        .catch((error: unknown): void => {
          respond(failed());
          console.error('[menu] basket run failed', error);
        });

      // Keeps the channel open: the reply comes long after this returns.
      return true;
    },
  );
};
