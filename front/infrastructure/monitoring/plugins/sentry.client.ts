import { configureSentry, ensureSentry } from '../utils/sentryClient';

const reasonOf = (value: unknown): unknown =>
  value instanceof ErrorEvent ? (value.error ?? value.message) : value;

export default defineNuxtPlugin((nuxtApp): void => {
  const dsn = useRuntimeConfig().public.sentry.dsn.trim();

  // No address to report to is the normal state of a local checkout. Calling
  // init anyway would warn on every page load about a decision nobody made.
  if (dsn.length === 0) return;

  configureSentry({
    app: nuxtApp.vueApp,
    dsn,
    // Errors only. Tracing on a static site that talks to one API would buy
    // numbers nobody reads, at the price of a request per page view.
    tracesSampleRate: 0,
  });

  // Nothing is downloaded until something fails. These watch for that first
  // failure, hand it to the client once it is up, and step aside: from then on
  // the client's own handlers see everything.
  const failures: unknown[] = [];

  const stopWatching = (): void => {
    window.removeEventListener('error', onWindowFailure);
    window.removeEventListener('unhandledrejection', onWindowFailure);
    stopWatchingVue();
  };

  const watchFailure = (failure: unknown): void => {
    failures.push(failure);
    if (failures.length > 1) return;

    ensureSentry()
      .then(({ captureException }): void => {
        stopWatching();
        failures.splice(0).forEach((entry): string => captureException(entry));
      })
      // A client that cannot load (blocked, offline) leaves the site working, unreported.
      .catch((): void => undefined);
  };

  const onWindowFailure = (event: ErrorEvent | PromiseRejectionEvent): void =>
    watchFailure(event instanceof PromiseRejectionEvent ? event.reason : reasonOf(event));

  window.addEventListener('error', onWindowFailure);
  window.addEventListener('unhandledrejection', onWindowFailure);
  const stopWatchingVue = nuxtApp.hook('vue:error', watchFailure);
});
