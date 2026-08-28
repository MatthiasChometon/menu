import { SlotWindow } from '../engine/slot';
import { FillResult, PlannedLine, ReportedEvent } from '../engine/type';
import { MenuClient, QueuedJob } from '../menu/client';
import { api } from '../browser';

type Settings = {
  endpoint?: string;
  deviceToken?: string;
};

const SHOP_URL = 'https://www.carrefour.fr/courses';
const POLL_ALARM = 'menu-poll';
const POLL_MINUTES = 5;

const settings = async (): Promise<Settings> =>
  api.storage.local.get(['endpoint', 'deviceToken']);

const shopTab = async (): Promise<chrome.tabs.Tab> => {
  const open = await api.tabs.query({ url: 'https://www.carrefour.fr/*' });

  return open[0] ?? (await api.tabs.create({ url: SHOP_URL, active: false }));
};

// Progress is forwarded as it happens rather than at the end: the point of the
// live view is to see a long run move, and a run that dies halfway should still
// have said what it had done.
const forwardProgress = (client: MenuClient, jobId: string): void => {
  api.runtime.onMessage.addListener((message: { kind: string; event: ReportedEvent }): void => {
    if (message.kind === 'progress') {
      void client.report(jobId, message.event);
    }
  });
};

const fill = async (
  tabId: number,
  lines: PlannedLine[],
  windows: SlotWindow[],
): Promise<FillResult> => api.tabs.sendMessage(tabId, { kind: 'fill', lines, windows });

// One notification at the end of a run, worded for what actually happened — a
// ready basket, an expired Carrefour session to renew, or a plain failure. The
// blocked case is the one that matters: it is how the reader learns a run did
// nothing because they were signed out, without watching the tab.
const notify = async (
  outcome: FillResult['outcome'],
  amount = 0,
  missing = 0,
): Promise<void> => {
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

  await api.notifications.create({ type: 'basic', iconUrl: 'icon-128.png', ...notices[outcome] });
};

const runOnce = async (): Promise<void> => {
  const { endpoint, deviceToken } = await settings();
  if (endpoint === undefined || deviceToken === undefined) {
    return;
  }

  const client = new MenuClient(endpoint, deviceToken);
  const job: QueuedJob | undefined = await client.claim();
  if (job === undefined) {
    return;
  }

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

// Reported by the content script whenever a Carrefour page is open. Forwarded to
// the API so the order page can tell the reader whether the shop is signed in.
const reportCarrefourSession = async (signedIn: boolean): Promise<void> => {
  const { endpoint, deviceToken } = await settings();
  if (endpoint === undefined || deviceToken === undefined) {
    return;
  }

  await new MenuClient(endpoint, deviceToken).reportCarrefourSession(signedIn).catch((): void => {});
};

api.runtime.onMessage.addListener((message: { kind?: string; signedIn?: boolean }): void => {
  if (message.kind === 'carrefour-session' && typeof message.signedIn === 'boolean') {
    void reportCarrefourSession(message.signedIn);
  }
});

api.alarms.onAlarm.addListener((alarm): void => {
  if (alarm.name === POLL_ALARM) {
    void runOnce();
  }
});

api.runtime.onInstalled.addListener((): void => {
  void api.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
});

api.runtime.onStartup.addListener((): void => {
  void api.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
});
