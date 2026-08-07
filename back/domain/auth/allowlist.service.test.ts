import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { EmailAllowlist } from './allowlist.service';

const allowlistOf = (value: string | undefined): EmailAllowlist =>
  new EmailAllowlist({ get: (): string | undefined => value } as unknown as ConfigService);

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
});
