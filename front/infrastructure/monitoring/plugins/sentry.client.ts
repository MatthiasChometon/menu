import { init } from '@sentry/vue';

import { isReportingHost } from '../rules/reportingHost';

export default defineNuxtPlugin((nuxtApp): void => {
  const { dsn, hosts } = useRuntimeConfig().public.sentry;
  const address = String(dsn ?? '').trim();

  // No address to report to is the normal state of a local checkout, and any
  // other host than the deployed one is not production. Calling init anyway
  // would file local and preview failures as production issues.
  if (address.length === 0 || !isReportingHost(window.location.hostname, hosts)) return;

  init({
    app: nuxtApp.vueApp,
    dsn: address,
    environment: 'production',
    // Errors only. Tracing on a static site that talks to one API would buy
    // numbers nobody reads, at the price of a request per page view.
    tracesSampleRate: 0,
  });
});
