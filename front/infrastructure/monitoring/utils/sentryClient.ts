type SentryModule = typeof import('@sentry/vue');

// The Sentry client is about a fifth of the script the first paint downloads and
// parses, for a tool nobody looks at until something breaks. It is fetched as its
// own chunk once the page is up, and errors reported meanwhile wait for it.
let loading: Promise<SentryModule> | undefined;
let initialised: Promise<void> | undefined;

export const loadSentry = (): Promise<SentryModule> => {
  loading ??= import('@sentry/vue');

  return loading;
};

export const startSentry = (options: Parameters<SentryModule['init']>[0]): void => {
  initialised = loadSentry().then((sentry): void => {
    sentry.init(options);
  });
};

// Resolves once Sentry is initialised, or at once when it was never started.
export const whenSentryReady = (): Promise<void> => initialised ?? Promise.resolve();
