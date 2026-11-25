// The HTTP status carried by whatever a failed request raised, read
// structurally rather than through Nuxt's error type.
export const statusCodeOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return undefined;

  return typeof error.statusCode === 'number' ? error.statusCode : undefined;
};

// A refusal the reader can act on (wrong link, wrong password) has a 4xx status
// of its own. No status at all (offline, the API unreachable), a 5xx or a 429
// says nothing about the reader's input: trying again later is the only answer.
export const isTransientFailure = (error: unknown): boolean => {
  const status = statusCodeOf(error);

  return status === undefined || status >= 500 || status === 429 || status === 408;
};
