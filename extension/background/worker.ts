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
    await api.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Panier prêt',
      message: `${result.productsAmount.toFixed(2)} € · ${result.missing.length} manquant(s). À toi de vérifier et de payer.`,
    });
  } catch (error: unknown) {
    await client.finish(job.id, { outcome: 'FAILED' });
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
