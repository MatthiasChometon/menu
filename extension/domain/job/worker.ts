import { browser } from '#imports';
import type { Browser } from '#imports';
import type { FillResult, PlannedLine, ReportedEvent, SlotWindow } from '../carrefour/type';
import { createMenuClient, type MenuClient } from './client';

// The background's job cycle, revealed as two operations over a private closure:
// claim-and-fill on a schedule, and relay the Carrefour session state. Everything
// else — the shop tab, the notification wording, the progress relay — stays inside.
export const createGroceryWorker = (): {
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
  // have said what it had done.
  const forwardProgress = (client: MenuClient, jobId: string): void => {
    browser.runtime.onMessage.addListener(
      (message: { kind: string; event: ReportedEvent }): void => {
        if (message.kind === 'progress') void client.report(jobId, message.event);
      },
    );
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

  const runOnce = async (): Promise<void> => {
    const { endpoint, deviceToken } = await settings();
    if (endpoint === undefined || deviceToken === undefined) return;

    const client = createMenuClient(endpoint, deviceToken);
    const job = await client.claim();
    if (job === undefined) return;

    forwardProgress(client, job.id);

    const tab = await shopTab();
    if (tab.id === undefined) {
      await client.finish(job.id, { outcome: 'FAILED' });
      await notify('FAILED');
      return;
    }

    try {
      const result = await fill(tab.id, job.lines, job.slotWindows ?? []);
      await client.finish(job.id, {
        outcome: result.outcome,
        // Cents on the wire: euros as a float would drift a centime at a time.
        productsCents: Math.round(result.productsAmount * 100),
        deliveryFeesCents: Math.round(result.deliveryFees * 100),
        shortOfMinimumCents: Math.round(result.shortOfMinimum * 100),
        missingFoodIds: result.missing,
        observations: result.sightings,
      });
      await notify(result.outcome, result.productsAmount, result.missing.length);
    } catch (error: unknown) {
      await client.finish(job.id, { outcome: 'FAILED' });
      await notify('FAILED');
      console.error('[menu] run failed', error);
    }
  };

  const reportCarrefourSession = async (signedIn: boolean): Promise<void> => {
    const { endpoint, deviceToken } = await settings();
    if (endpoint === undefined || deviceToken === undefined) return;

    await createMenuClient(endpoint, deviceToken)
      .reportCarrefourSession(signedIn)
      .catch((): void => {});
  };

  return { runOnce, reportCarrefourSession };
};
