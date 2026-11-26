type SentryModule = typeof import('./sentry');
type SentryOptions = Parameters<SentryModule['init']>[0];

// The Sentry client is about a quarter of the script a first paint would download
// and parse, for a tool nobody looks at until something breaks. So it is not
// fetched with the page: the first error, from anywhere, is what fetches it.
let loading: Promise<SentryModule> | undefined;
let initialised: Promise<SentryModule> | undefined;
let options: SentryOptions | undefined;

export const loadSentry = (): Promise<SentryModule> => {
  loading ??= import('./sentry');

  return loading;
};

// What to initialise with, kept until it is needed. Never called with no address
// to report to, so a local checkout never initialises it.
export const configureSentry = (value: SentryOptions): void => {
  options = value;
};

// The initialised client, fetched and started on the first call.
export const ensureSentry = (): Promise<SentryModule> => {
  initialised ??= loadSentry().then((sentry): SentryModule => {
    if (options !== undefined) sentry.init(options);

    return sentry;
  });

  return initialised;
};
