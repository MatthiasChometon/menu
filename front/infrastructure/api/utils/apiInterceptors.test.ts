import { describe, expect, it, vi } from 'vitest';
import { createApiInterceptors, pathOf } from './apiInterceptors';

const setup = (): ReturnType<typeof createApiInterceptors> & {
  expireSession: ReturnType<typeof vi.fn>;
  report: ReturnType<typeof vi.fn>;
} => {
  const expireSession = vi.fn();
  const report = vi.fn();

  return { expireSession, report, ...createApiInterceptors({ expireSession, report }) };
};

describe('the path of a request', () => {
  it.each([
    ['/recipes?token=secret', '/recipes'],
    ['/plain', '/plain'],
    ['https://api.example.test/menus/1?a=b#x', '/menus/1'],
  ])('keeps only the path of %s', (request, expected) => {
    expect(pathOf(request)).toBe(expected);
  });
});

describe('a failed REST call', () => {
  it('says the session ended on a 401 from a regular call', () => {
    const { onResponseError, expireSession, report } = setup();

    onResponseError({ request: '/grocery/jobs', response: { status: 401 } });

    expect(expireSession).toHaveBeenCalledOnce();
    expect(report).not.toHaveBeenCalled();
  });

  it.each(['/auth/login', '/auth/delete-account'])(
    'treats a 401 from %s as an answer, not as an ended session',
    (path) => {
      const { onResponseError, expireSession, report } = setup();

      onResponseError({ request: path, response: { status: 401 } });

      expect(expireSession).not.toHaveBeenCalled();
      expect(report).not.toHaveBeenCalled();
    },
  );

  it.each([500, 502, 503])('reports a %i once, with the path and no query', (status) => {
    const { onResponseError, expireSession, report } = setup();

    onResponseError({ request: '/grocery/jobs?token=secret', response: { status } });

    expect(expireSession).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledOnce();
    expect(report.mock.calls[0]?.[0]).toBe(`api:${status} /grocery/jobs`);
  });

  it.each([400, 403, 404, 409, 422])('leaves a %i to the caller', (status) => {
    const { onResponseError, expireSession, report } = setup();

    onResponseError({ request: '/grocery/jobs', response: { status } });

    expect(expireSession).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it('reports a network failure', () => {
    const { onRequestError, report } = setup();
    const cause = new TypeError('Failed to fetch');

    onRequestError({ request: '/grocery/jobs', error: cause });

    expect(report).toHaveBeenCalledExactlyOnceWith('api:network /grocery/jobs', cause);
  });

  it('does not report a request the reader cancelled', () => {
    const { onRequestError, report } = setup();

    onRequestError({ request: '/grocery/jobs', error: new DOMException('stop', 'AbortError') });

    expect(report).not.toHaveBeenCalled();
  });
});
