import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackgroundTasks } from '../../infrastructure/background/service';
import type { MailService } from '../../infrastructure/mail/service';
import type { UserRepository } from '../user/repository';
import type { UserMapper } from '../user/mapper';
import { AuthService } from './service';
import { EmailVerificationService } from './emailVerification/service';
import { PasswordResetService } from './passwordReset/service';
import type { PasswordService } from './emailAndPassword/password.service';
import type { AuthTokenRepository } from './tokens/repository';
import type { EmailAllowlist } from './allowlist.service';

// Every anonymous route that sends a mail must answer before the mail server
// has, and must answer the same whether or not the address has an account: a
// slow or dead mail server would otherwise show, in the response time, which
// addresses are known. Here the mail server never answers at all.
const record = { id: 'u1', email: 'a@example.com', locale: 'fr', emailVerifiedAt: null };

const neverAnswering = (): { mail: MailService; send: ReturnType<typeof vi.fn> } => {
  const send = vi.fn((): Promise<void> => new Promise<void>((): void => undefined));

  return { mail: { send } as unknown as MailService, send };
};

const config = { getOrThrow: (): string => 'https://menu.example' } as unknown as ConfigService;
const tokens = {
  issue: vi.fn().mockResolvedValue('t'.repeat(64)),
} as unknown as AuthTokenRepository;
const usersFinding = (found: unknown): UserRepository =>
  ({ findRecordByEmail: vi.fn().mockResolvedValue(found) }) as unknown as UserRepository;

afterEach((): void => {
  vi.restoreAllMocks();
});

describe.each([
  ['a known address', record],
  ['an unknown address', undefined],
])('asking for a password reset link with %s', (_, found) => {
  it('answers while the mail server is still silent', () => {
    const { mail } = neverAnswering();
    const service = new PasswordResetService(
      tokens,
      usersFinding(found),
      undefined as unknown as PasswordService,
      undefined as unknown as UserMapper,
      mail,
      new BackgroundTasks(),
      config,
    );

    expect(service.request('a@example.com')).toBeUndefined();
  });
});

describe('a link whose mail the server refuses', () => {
  it('is logged, not thrown, for a reset request', async () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation((): void => undefined);
    const background = new BackgroundTasks();
    const mail = {
      send: vi.fn().mockRejectedValue(new Error('ETIMEDOUT')),
    } as unknown as MailService;
    const service = new PasswordResetService(
      tokens,
      usersFinding(record),
      undefined as unknown as PasswordService,
      undefined as unknown as UserMapper,
      mail,
      background,
      config,
    );

    service.request('a@example.com');
    await background.settled();

    expect(logged).toHaveBeenCalledWith('password reset link: ETIMEDOUT');
  });
});

describe.each([
  ['a waiting address', record],
  ['an unknown address', undefined],
])('asking for another verification link with %s', (_, found) => {
  it('answers while the mail server is still silent', () => {
    const { mail } = neverAnswering();
    const service = new EmailVerificationService(
      tokens,
      usersFinding(found),
      mail,
      new BackgroundTasks(),
      config,
    );

    expect(service.resend('a@example.com')).toBeUndefined();
  });
});

describe.each([
  ['a free address', undefined],
  ['a taken address', record],
])('registering with %s', (_, existing) => {
  it('answers while the mail server is still silent', async () => {
    const { mail, send } = neverAnswering();
    const background = new BackgroundTasks();
    const users = {
      create: vi.fn().mockResolvedValue(existing === undefined ? record : undefined),
      findRecordByEmail: vi.fn().mockResolvedValue(existing),
    } as unknown as UserRepository;
    const verification = new EmailVerificationService(tokens, users, mail, background, config);
    const service = new AuthService(
      users,
      { hash: vi.fn().mockResolvedValue('hash') } as unknown as PasswordService,
      undefined as never,
      undefined as never,
      { assertAllowed: vi.fn() } as unknown as EmailAllowlist,
      verification,
      mail,
      background,
      config,
    );

    await expect(
      service.register({ email: 'a@example.com', password: 'long-enough-password' }),
    ).resolves.toBeUndefined();
    await vi.waitFor((): void => {
      expect(send).toHaveBeenCalledOnce();
    });
  });
});
