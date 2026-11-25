import type { FailureHandlers } from '../../api/utils/apiInterceptors';

// What nuxt-graphql-client hands its error handler, and then throws as is.
export type GraphqlFailure = {
  operationName: string;
  statusCode: number | undefined;
  gqlErrors: { message?: string; extensions?: { code?: unknown } }[] | undefined;
};

const hasCode = (failure: GraphqlFailure, code: string): boolean =>
  failure.gqlErrors?.some((error): boolean => error.extensions?.code === code) === true;

// Same rules as the REST calls: an ended session is announced, a failure nobody
// could prevent (no answer at all, a 5xx, an internal error) is reported, and
// every other refusal (validation, not found, forbidden) is left to the caller.
export const handleGraphqlFailure = (
  failure: GraphqlFailure,
  { expireSession, report }: FailureHandlers,
): void => {
  if (failure.statusCode === 401 || hasCode(failure, 'UNAUTHENTICATED')) {
    expireSession();
    return;
  }

  const hasNoAnswer = failure.statusCode === undefined && (failure.gqlErrors ?? []).length === 0;
  const isServerFault =
    (failure.statusCode !== undefined && failure.statusCode >= 500) ||
    hasCode(failure, 'INTERNAL_SERVER_ERROR');

  if (hasNoAnswer || isServerFault) {
    report(`graphql:${failure.operationName}`, failure);
  }
};
