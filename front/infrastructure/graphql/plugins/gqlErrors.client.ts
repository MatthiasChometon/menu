import type { GraphqlFailure } from '../utils/graphqlInterceptor';

// One handler for every failed GraphQL operation, instead of a copy in each
// composable that needs to know the session ended or the API is down.
export default defineNuxtPlugin((nuxtApp) => {
  const { reportError } = useErrorReporting();

  useGqlError((failure: GraphqlFailure): void => {
    handleGraphqlFailure(failure, {
      report: reportError,
      expireSession: (): void => announceSessionExpiry(nuxtApp, reportError),
    });
  });
});
