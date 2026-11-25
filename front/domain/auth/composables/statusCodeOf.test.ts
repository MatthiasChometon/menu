import { describe, expect, it } from 'vitest';

describe('statusCodeOf', () => {
  it('reads the status of whatever a failed request raised', () => {
    expect(statusCodeOf({ statusCode: 401 })).toBe(401);
  });

  it('ignores anything that is not a numeric status', () => {
    expect(statusCodeOf(undefined)).toBeUndefined();
    expect(statusCodeOf(null)).toBeUndefined();
    expect(statusCodeOf('boom')).toBeUndefined();
    expect(statusCodeOf({ statusCode: '401' })).toBeUndefined();
  });
});

describe('isTransientFailure', () => {
  it.each([
    undefined,
    { statusCode: 500 },
    { statusCode: 503 },
    { statusCode: 429 },
    { statusCode: 408 },
  ])('asks to try again for %j', (error) => {
    expect(isTransientFailure(error)).toBe(true);
  });

  it.each([
    { statusCode: 400 },
    { statusCode: 401 },
    { statusCode: 403 },
    { statusCode: 404 },
    { statusCode: 409 },
  ])('treats %j as a refusal', (error) => {
    expect(isTransientFailure(error)).toBe(false);
  });
});
