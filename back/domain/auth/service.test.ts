import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../user/repository';
import type { PasswordService } from './emailAndPassword/password.service';
import { AuthService } from './service';

type Harness = { service: AuthService; pretend: ReturnType<typeof vi.fn> };

const serviceFor = (record: unknown): Harness => {
  const pretend = vi.fn().mockResolvedValue(undefined);
  const users = {
    findRecordByEmail: vi.fn().mockResolvedValue(record),
  } as unknown as UserRepository;
  const passwords = { pretendToVerify: pretend, verify: vi.fn() } as unknown as PasswordService;
  const unused = undefined as never;

  return {
    service: new AuthService(users, passwords, unused, unused, unused, unused, unused, unused),
    pretend,
  };
};

describe('signing in with something that cannot match', () => {
  it('still spends the time of a password check for an unknown address', async () => {
    const { service, pretend } = serviceFor(undefined);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'whatever-long' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(pretend).toHaveBeenCalledWith('whatever-long');
  });

  it('still spends it for an account that only signs in through Google', async () => {
    const { service, pretend } = serviceFor({ passwordHash: null });

    await expect(
      service.login({ email: 'g@example.com', password: 'whatever-long' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(pretend).toHaveBeenCalledOnce();
  });
});
