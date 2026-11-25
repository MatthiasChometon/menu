import { registerEndpoint } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';

let answerWith = 400;

registerEndpoint('/auth/reset-password', {
  method: 'POST',
  handler: () => {
    throw createError({ statusCode: answerWith, statusMessage: 'No.' });
  },
});

describe('usePasswordReset', () => {
  it('has nothing to submit without a token', async () => {
    expect(await usePasswordReset().submit(undefined)).toBe('missing');
  });

  it('says the password was refused when the API finds it too short', async () => {
    answerWith = 400;

    expect(await usePasswordReset().submit('a-link')).toBe('refused');
  });

  it('calls a link the API refuses expired', async () => {
    answerWith = 401;

    expect(await usePasswordReset().submit('a-link')).toBe('expired');
  });

  it('does not call a link dead when the server merely failed to answer', async () => {
    answerWith = 502;

    expect(await usePasswordReset().submit('a-link')).toBe('unavailable');
  });
});
