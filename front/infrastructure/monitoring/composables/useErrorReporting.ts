import { captureException } from '@sentry/vue';

// Where a caught error goes instead of the console: handled on screen for the
// reader, but still sent to the one place that can tell us it is happening.
// With no DSN configured Sentry was never initialised and captureException does
// nothing, which is the right behaviour for a local checkout.
export const useErrorReporting = (): {
  reportError: (context: string, error: unknown) => void;
} => ({
  reportError: (context: string, error: unknown): void => {
    captureException(error, { tags: { context } });
  },
});
