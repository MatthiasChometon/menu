// Measurement code injected into every page before the app runs. It is serialised by
// Playwright, so it must not close over anything: its only input is the argument.
export type Probe = {
  /** Largest Contentful Paint so far, ms since navigation start (0 until one is reported). */
  lcp: number;
  /** Sum of the layout shifts that no input caused. */
  cls: number;
  /** One entry per interaction: the longest Event Timing duration of its events, ms. */
  interactions: number[];
  /** Time of the last click or key press, ms since navigation start. */
  lastInputAt: number;
  /** From the last click to the first DOM change (rAF-aligned), ms; undefined until it happens. */
  feedbackMs: number | undefined;
  /** When the main content of the watched screen first showed, ms since navigation start. */
  mainVisibleAt: number | undefined;
  /** Starts looking for the main content: `ready` is a selector inside <main>, `path` the route it belongs to. */
  watchMain: (ready: string, path: string) => void;
};

export type ProbeWindow = Window & { __probe: Probe };

export const installProbes = (options: { ready: string; path: string }): void => {
  const interactions = new Map<number, number>();
  const probe: Probe = {
    lcp: 0,
    cls: 0,
    interactions: [],
    lastInputAt: 0,
    feedbackMs: undefined,
    mainVisibleAt: undefined,
    watchMain: (ready, path): void => {
      probe.mainVisibleAt = undefined;
      const check = (): void => {
        const isOnPath = location.pathname.replace(/\/$/, '') === path.replace(/\/$/, '');
        const content = document.querySelector('main')?.querySelector(ready) ?? null;
        const isShown =
          content !== null &&
          content.checkVisibility() &&
          document.querySelector('main .animate-pulse') === null;
        if (isOnPath && isShown) {
          probe.mainVisibleAt = performance.now();
          performance.mark('main-visible');
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    },
  };
  (window as unknown as ProbeWindow).__probe = probe;

  new PerformanceObserver((list): void => {
    for (const entry of list.getEntries()) probe.lcp = entry.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  new PerformanceObserver((list): void => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
      if (!shift.hadRecentInput) probe.cls += shift.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });

  // Event Timing is what the INP metric is built on: an interaction is the group of
  // events sharing an interactionId, and its latency is the longest of them.
  new PerformanceObserver((list): void => {
    for (const entry of list.getEntries()) {
      const event = entry as PerformanceEntry & { interactionId: number };
      if (event.interactionId === 0) continue;
      interactions.set(
        event.interactionId,
        Math.max(interactions.get(event.interactionId) ?? 0, entry.duration),
      );
    }
    probe.interactions = [...interactions.values()];
  }).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit);

  addEventListener(
    'click',
    (event): void => {
      const startedAt = event.timeStamp;
      probe.lastInputAt = startedAt;
      probe.feedbackMs = undefined;
      const watcher = new MutationObserver((): void => {
        watcher.disconnect();
        requestAnimationFrame((): void => {
          probe.feedbackMs = performance.now() - startedAt;
        });
      });
      watcher.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    },
    true,
  );

  if (options.ready !== '') probe.watchMain(options.ready, options.path);
};
