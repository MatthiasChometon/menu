import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it } from 'vitest';
import { EmailAllowlist } from './allowlist.service';

// The deployed server is recognised by Passenger's global, not by NODE_ENV: a
// local prod-like stack runs NODE_ENV=production and must not be refused.
const passengerGlobals = globalThis as { PhusionPassenger?: unknown };

const allowlistOf = (value: string | undefined, deployed = false): EmailAllowlist => {
  if (deployed) passengerGlobals.PhusionPassenger = {};

  return new EmailAllowlist({
    get: (): string | undefined => value,
  } as unknown as ConfigService);
};

afterEach((): void => {
  delete passengerGlobals.PhusionPassenger;
});

describe('EmailAllowlist', () => {
  it('lets anyone in when no guest list is configured', () => {
    const allowlist = allowlistOf(undefined);

    expect(allowlist.isOpen()).toBe(true);
    expect(allowlist.allows('anyone@example.com')).toBe(true);
  });

  it('treats an empty setting as no guest list rather than as nobody', () => {
    expect(allowlistOf('   ').isOpen()).toBe(true);
  });

  it('admits an invited address', () => {
    expect(allowlistOf('me@example.com,mum@example.com').allows('mum@example.com')).toBe(true);
  });

  it('turns away an address that is not on the list', () => {
    const allowlist = allowlistOf('me@example.com');

    expect(allowlist.allows('stranger@example.com')).toBe(false);
    expect((): void => allowlist.assertAllowed('stranger@example.com')).toThrow(ForbiddenException);
  });

  it('ignores the casing and the spaces a human leaves in the setting', () => {
    const allowlist = allowlistOf(' Me@Example.com , mum@example.com ');

    expect(allowlist.allows('ME@EXAMPLE.COM')).toBe(true);
    expect(allowlist.allows(' mum@example.com ')).toBe(true);
  });

  it('does not admit an address that merely contains an invited one', () => {
    expect(allowlistOf('me@example.com').allows('not-me@example.com.evil.test')).toBe(false);
  });

  it('refuses to start on the deployed server with no guest list at all', () => {
    // Silently open is the failure nobody notices; refusing to boot is loud.
    expect((): void => allowlistOf(undefined, true).onModuleInit()).toThrow(/ALLOWED_EMAILS/);
  });

  it('starts happily without a guest list anywhere but the deployed server', () => {
    expect((): void => allowlistOf(undefined).onModuleInit()).not.toThrow();
  });

  it('starts on the deployed server once the guest list is set', () => {
    expect((): void => allowlistOf('me@example.com', true).onModuleInit()).not.toThrow();
  });

  it('starts on the deployed server when the door is deliberately opened', () => {
    // The star is the difference between a decision and an oversight, so it has
    // to boot where a blank setting refuses to.
    expect((): void => allowlistOf('*', true).onModuleInit()).not.toThrow();
  });

  it('admits a stranger once the door is deliberately opened', () => {
    const allowlist = allowlistOf('*', true);

    expect(allowlist.invitesAnyone()).toBe(true);
    expect(allowlist.allows('stranger@example.com')).toBe(true);
  });

  it('keeps the guest list closed when a star sits among real addresses', () => {
    // A star mixed into a list reads as a typo, not as an invitation to
    // everyone: opening the app is a whole-setting decision.
    const allowlist = allowlistOf('me@example.com,*');

    expect(allowlist.invitesAnyone()).toBe(false);
    expect(allowlist.allows('stranger@example.com')).toBe(false);
  });
});
