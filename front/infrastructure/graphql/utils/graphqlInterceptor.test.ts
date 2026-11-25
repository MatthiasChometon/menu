import { describe, expect, it, vi } from 'vitest';
import { handleGraphqlFailure, isUnauthenticated, type GraphqlFailure } from './graphqlInterceptor';

const handle = (
  failure: Partial<GraphqlFailure>,
): {
  expireSession: ReturnType<typeof vi.fn>;
  report: ReturnType<typeof vi.fn>;
  full: GraphqlFailure;
} => {
  const expireSession = vi.fn();
  const report = vi.fn();
  const full: GraphqlFailure = {
    operationName: 'MyGroceryDevices',
    statusCode: undefined,
    gqlErrors: [],
    ...failure,
  };

  handleGraphqlFailure(full, { expireSession, report });

  return { expireSession, report, full };
};

describe('a failed GraphQL operation', () => {
  it('says the session ended on an UNAUTHENTICATED error', () => {
    const { expireSession, report } = handle({
      statusCode: 200,
      gqlErrors: [{ message: 'no', extensions: { code: 'UNAUTHENTICATED' } }],
    });

    expect(expireSession).toHaveBeenCalledOnce();
    expect(report).not.toHaveBeenCalled();
  });

  it('says the session ended on an HTTP 401', () => {
    expect(handle({ statusCode: 401 }).expireSession).toHaveBeenCalledOnce();
  });

  it('reports a call that got no answer, once, under the operation name', () => {
    const { report, expireSession, full } = handle({});

    expect(report).toHaveBeenCalledExactlyOnceWith('graphql:MyGroceryDevices', full, full);
    expect(expireSession).not.toHaveBeenCalled();
  });

  it.each([500, 502, 503])('reports an HTTP %i', (statusCode) => {
    expect(handle({ statusCode }).report).toHaveBeenCalledOnce();
  });

  it('reports an INTERNAL_SERVER_ERROR answered with a 200', () => {
    const { report } = handle({
      statusCode: 200,
      gqlErrors: [{ extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
    });

    expect(report).toHaveBeenCalledOnce();
  });

  it.each(['BAD_USER_INPUT', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT'])(
    'leaves a %s refusal to the caller',
    (code) => {
      const { report, expireSession } = handle({
        statusCode: 200,
        gqlErrors: [{ extensions: { code } }],
      });

      expect(report).not.toHaveBeenCalled();
      expect(expireSession).not.toHaveBeenCalled();
    },
  );
});

describe('telling a signed-out reader from a failure', () => {
  it('recognises a 401', () => {
    expect(isUnauthenticated({ statusCode: 401, gqlErrors: [] })).toBe(true);
  });

  it('recognises an UNAUTHENTICATED error carried by a 200', () => {
    expect(
      isUnauthenticated({
        statusCode: 200,
        gqlErrors: [{ extensions: { code: 'UNAUTHENTICATED' } }],
      }),
    ).toBe(true);
  });

  it.each([
    ['a server fault', { statusCode: 500, gqlErrors: [] }],
    ['no answer at all', { statusCode: undefined, gqlErrors: [] }],
    ['a forbidden', { statusCode: 200, gqlErrors: [{ extensions: { code: 'FORBIDDEN' } }] }],
  ])('does not take %s for a signed-out reader', (_label, failure) => {
    expect(isUnauthenticated(failure)).toBe(false);
  });

  it('does not take a plain Error or nothing for one', () => {
    expect(isUnauthenticated(new Error('boom'))).toBe(false);
    expect(isUnauthenticated(undefined)).toBe(false);
  });
});
