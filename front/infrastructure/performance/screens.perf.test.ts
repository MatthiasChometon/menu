import { expect, test, type Browser } from '@playwright/test';
import { BUDGETS, PASSES } from './budgets';
import { median, openScreen, readProbe, waitForMain, type Screen } from './measure';
import type { ProbeWindow } from './probes';
import { SCREENS } from './screens';

// Timing tests on the built site (`pnpm generate`, served as deployed), the API stubbed,
// a mid-tier mobile emulated by a 4x CPU slowdown. Every assertion reads the median of
// PASSES samples: one slow run on a busy machine is noise, a slow median is a bug.
// A failed test is retried once by the config, never more.

const WAIT_MS = 20_000;
const SETTLE_MS = 1500;

const linkTo = (path: string): string => `a[href="${path}"]:visible, a[href="${path}/"]:visible`;

const checkNothingUnstubbed = (unstubbed: string[]): void => {
  expect(unstubbed, 'every API operation the screen calls has a seeded answer').toEqual([]);
};

const coldLoad = async (
  browser: Browser,
  baseURL: string,
  screen: Screen,
): Promise<{ lcp: number; cls: number; mainMs: number }> => {
  const { page, unstubbed, close } = await openScreen(browser, baseURL, screen, screen.path);
  try {
    await page.goto(screen.path);
    const mainMs = await waitForMain(page, WAIT_MS);
    await page.waitForTimeout(SETTLE_MS);
    const { lcp, cls, shifts } = await readProbe(page);
    if (shifts.length > 0)
      process.stdout.write(`SHIFTS ${screen.name} | ${shifts.join(' || ')}
`);
    checkNothingUnstubbed(unstubbed);
    if (lcp === 0) throw new Error(`${screen.name}: no largest-contentful-paint entry arrived`);

    return { lcp, cls, mainMs };
  } finally {
    await close();
  }
};

const warmNavigation = async (
  browser: Browser,
  baseURL: string,
  screen: Screen,
): Promise<{ mainMs: number; feedbackMs: number }> => {
  // Watching starts once the page the reader comes from is settled: the probe is
  // told what to wait for only then, so that page's own content never counts.
  const { page, unstubbed, close } = await openScreen(browser, baseURL, screen, '');
  try {
    await page.goto(screen.from);
    await page.locator('main h1').first().waitFor({ timeout: WAIT_MS });
    await page.waitForTimeout(SETTLE_MS);

    await page.evaluate(
      ({ ready, path }): void => {
        (window as unknown as ProbeWindow).__probe.watchMain(ready, path);
      },
      { ready: screen.ready, path: screen.path },
    );
    await page.locator(linkTo(screen.path)).first().click();
    const shownAt = await waitForMain(page, WAIT_MS);
    const { lastInputAt, feedbackMs } = await readProbe(page);
    checkNothingUnstubbed(unstubbed);
    if (feedbackMs === undefined) throw new Error(`${screen.name}: the tap changed nothing`);

    return { mainMs: shownAt - lastInputAt, feedbackMs };
  } finally {
    await close();
  }
};

const interactionLatencies = async (
  browser: Browser,
  baseURL: string,
  screen: Screen,
): Promise<{ latencies: number[]; feedbacks: number[] }> => {
  const interaction = screen.interaction;
  if (interaction === undefined) throw new Error(`${screen.name} has no interaction`);

  const { page, unstubbed, close } = await openScreen(browser, baseURL, screen, screen.path);
  try {
    await page.goto(screen.path);
    await waitForMain(page, WAIT_MS);
    await page.waitForTimeout(SETTLE_MS);

    const feedbacks: number[] = [];
    for (let index = 0; index < PASSES; index += 1) {
      await interaction.perform(page, index);
      await page.waitForTimeout(300);
      const { feedbackMs } = await readProbe(page);
      if (feedbackMs !== undefined) feedbacks.push(feedbackMs);
    }
    const { interactions } = await readProbe(page);
    checkNothingUnstubbed(unstubbed);
    // Event Timing reports only what lasted 16 ms or more. No entry at all means the
    // measurement did not work, which must never read as an instant interaction.
    if (interactions.length === 0) {
      throw new Error(`${screen.name}: Event Timing reported no interaction, nothing was measured`);
    }

    return { latencies: interactions, feedbacks };
  } finally {
    await close();
  }
};

const samples = async <T>(take: () => Promise<T>): Promise<T[]> => {
  const taken: T[] = [];
  for (let pass = 0; pass < PASSES; pass += 1) taken.push(await take());

  return taken;
};

// The numbers are the point of the CI log, next to the verdict.
const report = (screen: string, what: string, values: Record<string, number>): void => {
  test.info().annotations.push({ type: `${screen} ${what}`, description: JSON.stringify(values) });
  process.stdout.write(`PERF ${screen} | ${what} | ${JSON.stringify(values)}\n`);
};

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test(`cold load: LCP within ${BUDGETS.coldLcpMs} ms, layout shift within ${BUDGETS.layoutShift}`, async ({
      browser,
      baseURL,
    }) => {
      test.setTimeout(PASSES * 30_000);
      const runs = await samples(() => coldLoad(browser, baseURL ?? '', screen));
      const lcp = median(runs.map((run): number => run.lcp));
      const cls = median(runs.map((run): number => run.cls));
      report(screen.name, 'cold', {
        lcpMs: Math.round(lcp),
        cls: Number(cls.toFixed(3)),
        mainMs: Math.round(median(runs.map((run): number => run.mainMs))),
      });

      expect(lcp, 'median LCP').toBeLessThanOrEqual(BUDGETS.coldLcpMs);
      expect(cls, 'median CLS').toBeLessThanOrEqual(BUDGETS.layoutShift);
    });

    test(`warm navigation: main content within ${BUDGETS.warmMainContentMs} ms, feedback within ${BUDGETS.feedbackMs} ms`, async ({
      browser,
      baseURL,
    }) => {
      test.setTimeout(PASSES * 40_000);
      const runs = await samples(() => warmNavigation(browser, baseURL ?? '', screen));
      const mainMs = median(runs.map((run): number => run.mainMs));
      const feedbackMs = median(runs.map((run): number => run.feedbackMs));
      report(screen.name, 'warm', {
        mainMs: Math.round(mainMs),
        feedbackMs: Math.round(feedbackMs),
      });

      expect(mainMs, 'median time to main content').toBeLessThanOrEqual(BUDGETS.warmMainContentMs);
      expect(feedbackMs, 'median time to a visible change').toBeLessThanOrEqual(BUDGETS.feedbackMs);
    });

    const interaction = screen.interaction;
    if (interaction !== undefined) {
      test(`${interaction.name}: INP within ${BUDGETS.interactionMs} ms, feedback within ${BUDGETS.feedbackMs} ms`, async ({
        browser,
        baseURL,
      }) => {
        test.setTimeout(PASSES * 30_000);
        const { latencies, feedbacks } = await interactionLatencies(browser, baseURL ?? '', screen);
        const inp = median(latencies);
        const feedbackMs = feedbacks.length === 0 ? undefined : median(feedbacks);
        report(screen.name, 'interaction', {
          inpMs: Math.round(inp),
          worstMs: Math.round(Math.max(...latencies)),
          entries: latencies.length,
          feedbackMs: Math.round(feedbackMs ?? -1),
        });

        expect(inp, 'median interaction latency').toBeLessThanOrEqual(BUDGETS.interactionMs);
        if (interaction.feedbackIsNative !== true) {
          expect(feedbackMs, 'the tap changed something').toBeDefined();
          expect(feedbackMs ?? Infinity, 'median time to a visible change').toBeLessThanOrEqual(
            BUDGETS.feedbackMs,
          );
        }
      });
    }
  });
}
