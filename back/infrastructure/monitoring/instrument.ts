import { init } from '@sentry/nestjs';

// Imported first in main.ts, before anything from Nest, because Sentry patches
// the modules it watches as they load: initialised afterwards it would see a
// framework already wired and report almost nothing.
const dsn = (process.env.SENTRY_DSN ?? '').trim();

// No address to report to is the normal state of a local checkout, and calling
// init anyway warns on every boot about a decision nobody made.
if (dsn.length > 0) {
  init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Errors only, as on the front. Tracing an API two people call would buy
    // numbers nobody reads, and cost a request per request.
    tracesSampleRate: 0,
  });
}
