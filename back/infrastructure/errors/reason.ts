/** What went wrong, as a line for a log: the message when there is one. */
export const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';
