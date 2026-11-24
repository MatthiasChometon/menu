import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it } from 'vitest';
import { sessionSecret } from './secret';

const passengerGlobals = globalThis as { PhusionPassenger?: unknown };

const configWith = (secret: string): ConfigService =>
  ({ getOrThrow: (): string => secret }) as unknown as ConfigService;

afterEach((): void => {
  delete passengerGlobals.PhusionPassenger;
});

describe('the session secret', () => {
  it('is taken as it is on a developer machine', () => {
    expect(sessionSecret(configWith('dev-secret-change-me'))).toBe('dev-secret-change-me');
  });

  it('is not held to the deployed server checks by NODE_ENV alone', () => {
    // A local prod-like compose stack runs NODE_ENV=production with a throwaway
    // secret; only the deployed server (Passenger) refuses a weak one.
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(sessionSecret(configWith('short'))).toBe('short');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('refuses the example value on the deployed server', () => {
    passengerGlobals.PhusionPassenger = {};

    expect(() => sessionSecret(configWith('dev-secret-change-me'))).toThrow(/example value/);
  });

  it('refuses a short secret on the deployed server', () => {
    passengerGlobals.PhusionPassenger = {};

    expect(() => sessionSecret(configWith('too-short'))).toThrow(/at least 32/);
  });

  it('accepts a long one on the deployed server', () => {
    passengerGlobals.PhusionPassenger = {};
    const secret = 'x'.repeat(48);

    expect(sessionSecret(configWith(secret))).toBe(secret);
  });
});
