import type { FillResult, PlannedLine, ReportedEvent, SlotWindow } from '../carrefour/type';
import type { RetryOptions } from '../../infrastructure/retry/retry';
import { logFailure } from '../../infrastructure/logging/failure';
import { createMenuClient, type MenuClient } from './client';
import type { JobOutcome, QueuedJob } from './type';

// The background's job cycle, revealed as two operations over a private closure:
// claim-and-fill on a schedule, and relay the Carrefour session state. Everything
// else — the shop tab, the notification wording, the progress relay — stays inside.
type Progress = { kind: 'progress'; event: ReportedEvent };

const isProgress = (message: unknown): message is Progress =>
  typeof message === 'object' &&
  message !== null &&
  'kind' in message &&
  message.kind === 'progress' &&
  'event' in message;

export const createGroceryWorker = (
  retry: Partial<RetryOptions> = {},
): {
  runOnce: () => Promise<void>;
  reportCarrefourSession: (signedIn: boolean) => Promise<void>;
} => {
  const SHOP_URL = 'https://www.carrefour.fr/courses';

  const settings = async (): Promise<{ endpoint?: string; deviceToken?: string }> =>
    browser.storage.local.get(['endpoint', 'deviceToken']);

  const shopTab = async (): Promise<Browser.tabs.Tab> => {
    const open = await browser.tabs.query({ url: 'https://www.carrefour.fr/*' });
    return open[0] ?? (await browser.tabs.create({ url: SHOP_URL, active: false }));
  };

  // Progress is forwarded as it happens rather than at the end: the point of the
  // live view is to see a long run move, and a run that dies halfway should still
  // have said what it had done. Returns what stops the forwarding: the listener
  // belongs to one run, and one left behind would report the next runs' progress
  // to this one too.
  const forwardProgress = (client: MenuClient, jobId: string): (() => void) => {
    const listener = (message: unknown): void => {
      if (!isProgress(message)) return;

      client.report(jobId, message.event).catch(logFailure('progress report'));
    };
    browser.runtime.onMessage.addListener(listener);

    return (): void => browser.runtime.onMessage.removeListener(listener);
  };

  const fill = async (
    tabId: number,
    lines: PlannedLine[],
    windows: SlotWindow[],
  ): Promise<FillResult> => browser.tabs.sendMessage(tabId, { kind: 'fill', lines, windows });

  // One notification at the end of a run, worded for what actually happened — a
  // ready basket, an expired Carrefour session to renew, or a plain failure. The
  // blocked case is the one that matters: it is how the reader learns a run did
  // nothing because they were signed out, without watching the tab.
  const notify = async (outcome: FillResult['outcome'], amount = 0, missing = 0): Promise<void> => {
    const notices: Record<FillResult['outcome'], { title: string; message: string }> = {
      SUCCEEDED: {
        title: 'Panier prêt',
        message: `${amount.toFixed(2)} € · ${missing} manquant(s). À toi de vérifier et de payer.`,
      },
      BLOCKED: {
        title: 'Connexion Carrefour expirée',
        message: 'Reconnecte-toi à Carrefour, puis relance le remplissage.',
      },
      FAILED: {
        title: 'Remplissage interrompu',
        message: 'Quelque chose a coincé. Réessaie dans un moment.',
      },
    };

    await browser.notifications.create({
      type: 'basic',
      iconUrl: '/icon-128.png',
      ...notices[outcome],
    });
  };

  // Cents on the wire: euros as a float would drift a centime at a time.
  const outcomeOf = (result: FillResult): JobOutcome => ({
    outcome: result.outcome,
    productsCents: Math.round(result.productsAmount * 100),
    deliveryFeesCents: Math.round(result.deliveryFees * 100),
    shortOfMinimumCents: Math.round(result.shortOfMinimum * 100),
    missingFoodIds: result.missing,
    observations: result.sightings,
  });

  // The run's result, or undefined when it could not be had (said in the log).
  const fillBasket = async (job: QueuedJob): Promise<FillResult | undefined> => {
    try {
      const tab = await shopTab();
      if (tab.id === undefined) return undefined;

      return await fill(tab.id, job.lines, job.slotWindows ?? []);
    } catch (error: unknown) {
      logFailure('run')(error);

      return undefined;
    }
  };

  // The reader is told what the run did even when the menu could not be told:
  // a ready basket is a ready basket.
  const finishRun = async (client: MenuClient, job: QueuedJob): Promise<void> => {
    const result = await fillBasket(job);

    await client
      .finish(job.id, result === undefined ? { outcome: 'FAILED' } : outcomeOf(result))
      .catch(logFailure('finish'));

    if (result === undefined) {
      await notify('FAILED');
      return;
    }
    await notify(result.outcome, result.productsAmount, result.missing.length);
  };

  const runOnce = async (): Promise<void> => {
    const { endpoint, deviceToken } = await settings();
    if (endpoint === undefined || deviceToken === undefined) return;

    const client = createMenuClient(endpoint, deviceToken, retry);
    const job = await client.claim();
    if (job === undefined) return;

    const stopForwarding = forwardProgress(client, job.id);
    try {
      await finishRun(client, job);
    } finally {
      stopForwarding();
    }
  };

  const reportCarrefourSession = async (signedIn: boolean): Promise<void> => {
    const { endpoint, deviceToken } = await settings();
    if (endpoint === undefined || deviceToken === undefined) return;

    await createMenuClient(endpoint, deviceToken, retry)
      .reportCarrefourSession(signedIn)
      .catch(logFailure('carrefour session report'));
  };

  return { runOnce, reportCarrefourSession };
};
