// What the client does with a failed call, in one place so no component and no
// composable carries a copy of it:
//   - a 401 on a signed-in call means the session ended: say so, once, and let
//     whoever owns the session decide what follows;
//   - a failure nobody could have prevented (network down, a 5xx) is reported;
//   - every other answer (a 400, a 404, a 409...) is the caller's to read.

export type FailureHandlers = {
  /** Tells the session owner that the session ended on the server. */
  expireSession: () => void;
  /** Sends an unexpected failure to monitoring. `source` is what the failure is
   *  known by afterwards (the response, the cause), so it is sent only once. */
  report: (context: string, error: unknown, source: object) => void;
};

// `/auth/*` answers 401 for a wrong password or a wrong confirmation, which is
// a result, not an ended session.
const ANSWERS_401_AS_RESULT = '/auth/';

// Only the path: a query string can carry a token or an address.
export const pathOf = (request: unknown): string => {
  const raw = typeof request === 'string' ? request : (request as Request | undefined)?.url;
  const text = raw ?? '';

  try {
    return new URL(text, 'http://placeholder.invalid').pathname;
  } catch {
    return text.split('?')[0] ?? '';
  }
};

// What ofetch retries by itself: a read (never a write) once more, on these
// statuses or when no answer came (it counts that as a 500). A call about to be
// retried has not failed yet; only the attempt that does is worth reporting.
const RETRIED_STATUSES: ReadonlySet<number> = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const PAYLOAD_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type CallOptions = { method?: string; retry?: number | false } | undefined;

export const willBeRetried = (options: CallOptions, status: number | undefined): boolean => {
  if (options === undefined || options.retry === false) return false;

  const remaining =
    typeof options.retry === 'number'
      ? options.retry
      : PAYLOAD_METHODS.has((options.method ?? 'GET').toUpperCase())
        ? 0
        : 1;

  return remaining > 0 && RETRIED_STATUSES.has(status ?? 500);
};

export const isUnexpectedStatus = (status: number | undefined): boolean =>
  status === undefined || status >= 500;

export const createApiInterceptors = ({
  expireSession,
  report,
}: FailureHandlers): {
  onRequestError: (context: { request: unknown; options?: CallOptions; error: Error }) => void;
  onResponseError: (context: {
    request: unknown;
    options?: CallOptions;
    response: { status: number } & object;
  }) => void;
} => ({
  onRequestError: ({ request, options, error }): void => {
    // The reader leaving the page cancels what was in flight: not a failure.
    if (error.name === 'AbortError' || willBeRetried(options, undefined)) return;

    report(`api:network ${pathOf(request)}`, error, error);
  },
  onResponseError: ({ request, options, response }): void => {
    const path = pathOf(request);

    if (willBeRetried(options, response.status)) return;

    if (response.status === 401 && !path.startsWith(ANSWERS_401_AS_RESULT)) {
      expireSession();
      return;
    }

    if (isUnexpectedStatus(response.status)) {
      report(
        `api:${response.status} ${path}`,
        new Error(`${response.status} on ${path}`),
        response,
      );
    }
  },
});
