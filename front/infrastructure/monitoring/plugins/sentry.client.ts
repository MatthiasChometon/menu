import { init } from '@sentry/vue';

export default defineNuxtPlugin((nuxtApp): void => {
  const dsn = String(useRuntimeConfig().public.sentry?.dsn ?? '').trim();

  // No address to report to is the normal state of a local checkout. Calling
  // init anyway would warn on every page load about a decision nobody made.
  if (dsn.length === 0) return;

  init({
    app: nuxtApp.vueApp,
    dsn,
    // Errors only. Tracing on a static site that talks to one API would buy
    // numbers nobody reads, at the price of a request per page view.
    tracesSampleRate: 0,
  });
});
