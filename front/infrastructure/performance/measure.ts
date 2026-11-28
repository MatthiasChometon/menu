import { devices, type Browser, type Page } from '@playwright/test';
import { readCalibration } from '../../perf-calibration.cjs';
import { installProbes, type ProbeWindow } from './probes';
import { stubApi, type Reader } from './stubApi';

/** The median: what every timing assertion reads, never a single sample. */
export const median = (samples: number[]): number => {
  if (samples.length === 0) throw new Error('A median needs at least one sample.');
  const sorted = [...samples].sort((a, b): number => a - b);
  const middle = Math.floor(sorted.length / 2);
  const low = sorted[middle - 1] ?? 0;
  const high = sorted[middle] ?? 0;

  return sorted.length % 2 === 0 ? (low + high) / 2 : high;
};

export type Screen = {
  name: string;
  reader: Reader;
  path: string;
  /** A selector inside <main> that exists once the screen shows its content. */
  ready: string;
  /** The page a reader comes from, to measure a client-side navigation. */
  from: string;
  /** A repeatable interaction the screen is used with. */
  interaction?: {
    name: string;
    perform: (page: Page, index: number) => Promise<void>;
    /** Typing shows its character in the browser itself: there is no app feedback to time. */
    feedbackIsNative?: boolean;
  };
};

/** Calibrated once per run to this host: the same value Lighthouse reads. */
const { slowdown: CPU_SLOWDOWN } = readCalibration();

// A Monday, so the rolling week starts on a known day and the seeded plan covers it.
const NOW = new Date('2026-09-21T10:00:00+02:00');

/** A fresh browser context (empty cache, no service worker) on a throttled mid-tier mobile. */
export const openScreen = async (
  browser: Browser,
  baseURL: string,
  screen: Screen,
  readyOn: string,
): Promise<{ page: Page; unstubbed: string[]; close: () => Promise<void> }> => {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 670 },
    baseURL,
    // The app speaks French on `/`; an English browser is sent to `/en`.
    locale: 'fr-FR',
    serviceWorkers: 'block',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  await page.clock.setFixedTime(NOW);
  const unstubbed = await stubApi(page, screen.reader);
  await page.addInitScript(installProbes, {
    ready: readyOn === '' ? '' : screen.ready,
    path: readyOn,
  });

  return { page, unstubbed, close: (): Promise<void> => context.close() };
};

export type Reading = Omit<ProbeWindow['__probe'], 'watchMain'>;

/** What the page measured so far (the probe's functions do not cross the wire). */
export const readProbe = (page: Page): Promise<Reading> =>
  page.evaluate((): Reading => {
    const { lcp, cls, shifts, interactions, lastInputAt, feedbackMs, mainVisibleAt } = (
      window as unknown as ProbeWindow
    ).__probe;

    return { lcp, cls, shifts, interactions, lastInputAt, feedbackMs, mainVisibleAt };
  });

/** Waits until the screen's main content showed and returns when, ms since navigation start. */
export const waitForMain = async (page: Page, timeoutMs: number): Promise<number> => {
  await page.waitForFunction(
    (): boolean => (window as unknown as ProbeWindow).__probe.mainVisibleAt !== undefined,
    undefined,
    { timeout: timeoutMs },
  );
  const { mainVisibleAt } = await readProbe(page);
  if (mainVisibleAt === undefined) throw new Error('The main content mark disappeared.');

  return mainVisibleAt;
};
