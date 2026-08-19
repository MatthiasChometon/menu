import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { EmailAllowlist } from './allowlist.service';

const allowlistOf = (value: string | undefined, nodeEnv?: string): EmailAllowlist =>
  new EmailAllowlist({
    get: (key: string): string | undefined => (key === 'NODE_ENV' ? nodeEnv : value),
  } as unknown as ConfigService);

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

  it('refuses to start in production with no guest list at all', () => {
    // Silently open is the failure nobody notices; refusing to boot is loud.
    expect((): void => allowlistOf(undefined, 'production').onModuleInit()).toThrow(
      /ALLOWED_EMAILS/,
    );
  });

  it('starts happily without a guest list anywhere but production', () => {
    expect((): void => allowlistOf(undefined, 'development').onModuleInit()).not.toThrow();
  });

  it('starts in production once the guest list is set', () => {
    expect((): void => allowlistOf('me@example.com', 'production').onModuleInit()).not.toThrow();
  });

  it('starts in production when the door is deliberately opened', () => {
    // The star is the difference between a decision and an oversight, so it has
    // to boot where a blank setting refuses to.
    expect((): void => allowlistOf('*', 'production').onModuleInit()).not.toThrow();
  });

  it('admits a stranger once the door is deliberately opened', () => {
    const allowlist = allowlistOf('*', 'production');

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
