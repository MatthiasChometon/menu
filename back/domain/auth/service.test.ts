import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../user/repository';
import type { PasswordService } from './emailAndPassword/password.service';
import { AuthService } from './service';

type Harness = { service: AuthService; pretendToVerify: ReturnType<typeof vi.fn> };

// Only what login touches is real; the rest is named so a new dependency is a
// visible change here rather than another `undefined` in a list.
const serviceWhereLookupFinds = (record: unknown): Harness => {
  const pretendToVerify = vi.fn().mockResolvedValue(undefined);
  const dependencies = {
    users: { findRecordByEmail: vi.fn().mockResolvedValue(record) } as unknown as UserRepository,
    passwords: { pretendToVerify, verify: vi.fn() } as unknown as PasswordService,
  };
  const unusedByLogin = undefined as never;

  return {
    service: new AuthService(
      dependencies.users,
      dependencies.passwords,
      unusedByLogin, // mapper
      unusedByLogin, // jwt
      unusedByLogin, // allowlist
      unusedByLogin, // verification
      unusedByLogin, // mail
      unusedByLogin, // config
    ),
    pretendToVerify,
  };
};

describe('signing in with something that cannot match', () => {
  it('runs a password check anyway for an unknown address', async () => {
    const { service, pretendToVerify } = serviceWhereLookupFinds(undefined);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'whatever-long' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(pretendToVerify).toHaveBeenCalledWith('whatever-long');
  });

  it('runs a password check anyway for an account that only signs in through Google', async () => {
    const { service, pretendToVerify } = serviceWhereLookupFinds({ passwordHash: null });

    await expect(
      service.login({ email: 'g@example.com', password: 'whatever-long' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(pretendToVerify).toHaveBeenCalledOnce();
  });
});
