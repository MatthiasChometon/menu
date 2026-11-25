import type { FailureHandlers } from '../../api/utils/apiInterceptors';

// What nuxt-graphql-client hands its error handler, and then throws as is.
export type GraphqlFailure = {
  operationName: string;
  statusCode: number | undefined;
  gqlErrors: { message?: string; extensions?: { code?: unknown } }[] | undefined;
};

const hasCode = (failure: Partial<Pick<GraphqlFailure, 'gqlErrors'>>, code: string): boolean =>
  failure.gqlErrors?.some((error): boolean => error.extensions?.code === code) === true;

// The server refused because nobody is signed in. Not a fault for a read that
// only means something for a signed-in reader: that one answers "nothing yet",
// while every other failure must stay visible as a failure.
export const isUnauthenticated = (failure: unknown): boolean => {
  if (typeof failure !== 'object' || failure === null) return false;
  const candidate = failure as Partial<GraphqlFailure>;

  return candidate.statusCode === 401 || hasCode(candidate, 'UNAUTHENTICATED');
};

// Same rules as the REST calls: an ended session is announced, a failure nobody
// could prevent (no answer at all, a 5xx, an internal error) is reported, and
// every other refusal (validation, not found, forbidden) is left to the caller.
export const handleGraphqlFailure = (
  failure: GraphqlFailure,
  { expireSession, report }: FailureHandlers,
): void => {
  if (isUnauthenticated(failure)) {
    expireSession();
    return;
  }

  const hasNoAnswer = failure.statusCode === undefined && (failure.gqlErrors ?? []).length === 0;
  const isServerFault =
    (failure.statusCode !== undefined && failure.statusCode >= 500) ||
    hasCode(failure, 'INTERNAL_SERVER_ERROR');

  if (hasNoAnswer || isServerFault) {
    report(`graphql:${failure.operationName}`, failure, failure);
  }
};
