import { registerEndpoint } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';

let answerWith = 410;

registerEndpoint('/auth/verify-email', {
  method: 'POST',
  handler: () => {
    throw createError({ statusCode: answerWith, statusMessage: 'No.' });
  },
});

describe('useEmailVerification', () => {
  it('has nothing to follow without a token', async () => {
    expect(await useEmailVerification().verify(undefined)).toBe('missing');
    expect(await useEmailVerification().verify('')).toBe('missing');
  });

  it('calls a link the API refuses expired', async () => {
    answerWith = 400;

    expect(await useEmailVerification().verify('spent')).toBe('expired');
  });

  it('does not call a link dead when the server merely failed to answer', async () => {
    answerWith = 503;

    expect(await useEmailVerification().verify('good-link')).toBe('unavailable');
  });
});
