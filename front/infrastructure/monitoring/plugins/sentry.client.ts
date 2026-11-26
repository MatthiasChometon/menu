import { startSentry, whenSentryReady } from '../utils/sentryClient';

export default defineNuxtPlugin((nuxtApp): void => {
  const dsn = useRuntimeConfig().public.sentry.dsn.trim();

  // No address to report to is the normal state of a local checkout. Calling
  // init anyway would warn on every page load about a decision nobody made.
  if (dsn.length === 0) return;

  // After the page is interactive, so that the client does not compete with the
  // first paint. A failure before then is reported once it is up.
  nuxtApp.hook('app:mounted', (): void => {
    const start = (): void =>
      startSentry({
        app: nuxtApp.vueApp,
        dsn,
        // Errors only. Tracing on a static site that talks to one API would buy
        // numbers nobody reads, at the price of a request per page view.
        tracesSampleRate: 0,
      });

    if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 3000 });
    else setTimeout(start, 1);
  });

  // A client that cannot load (blocked, offline) leaves the site working, unreported.
  whenSentryReady().catch((): void => undefined);
});
