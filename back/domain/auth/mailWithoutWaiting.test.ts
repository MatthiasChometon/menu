import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest';
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

const refusing = (): MailService =>
  ({ send: vi.fn().mockRejectedValue(new Error('ETIMEDOUT')) }) as unknown as MailService;

const passwordReset = (
  found: unknown,
  mail: MailService,
  background: BackgroundTasks,
): PasswordResetService =>
  new PasswordResetService(
    tokens,
    usersFinding(found),
    undefined as unknown as PasswordService,
    undefined as unknown as UserMapper,
    mail,
    background,
    config,
  );

const registration = (
  existing: unknown,
  mail: MailService,
  background: BackgroundTasks,
): AuthService => {
  const users = {
    create: vi.fn().mockResolvedValue(existing === undefined ? record : undefined),
    findRecordByEmail: vi.fn().mockResolvedValue(existing),
  } as unknown as UserRepository;
  const verification = new EmailVerificationService(tokens, users, mail, background, config);

  return new AuthService(
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
};

const newAccount = { email: 'a@example.com', password: 'long-enough-password' };

describe.each([
  ['a known address', record],
  ['an unknown address', undefined],
])('asking for a password reset link with %s', (_, found) => {
  it('hands the mail over without waiting for the mail server', () => {
    const { mail, send } = neverAnswering();
    const background = new BackgroundTasks();

    expect(passwordReset(found, mail, background).request('a@example.com')).toBeUndefined();

    // Nothing has been sent yet and the call is already back: the send is the
    // background task's to wait for.
    expect(send).not.toHaveBeenCalled();
  });

  it('is back while a slow mail server has not answered yet', async () => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve): void => {
      release = resolve;
    });
    let answered = false;
    const send = vi.fn(async (): Promise<void> => {
      await gate;
      answered = true;
    });
    const background = new BackgroundTasks();

    passwordReset(found, { send } as unknown as MailService, background).request('a@example.com');
    await vi.waitFor((): void => {
      expect(send).toHaveBeenCalledTimes(found === undefined ? 0 : 1);
    });
    expect(answered).toBe(false);

    release();
    await background.settled();
    expect(answered).toBe(found !== undefined);
  });
});

describe.each([
  ['a waiting address', record],
  ['an unknown address', undefined],
])('asking for another verification link with %s', (_, found) => {
  it('hands the mail over without waiting for the mail server', () => {
    const { mail, send } = neverAnswering();
    const service = new EmailVerificationService(
      tokens,
      usersFinding(found),
      mail,
      new BackgroundTasks(),
      config,
    );

    expect(service.resend('a@example.com')).toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});

describe.each([
  ['a free address', undefined],
  ['a taken address', record],
])('registering with %s', (_, existing) => {
  it('is answered while the mail server never answers', async () => {
    const { mail, send } = neverAnswering();

    await expect(
      registration(existing, mail, new BackgroundTasks()).register(newAccount),
    ).resolves.toBeUndefined();
    await vi.waitFor((): void => {
      expect(send).toHaveBeenCalledOnce();
    });
  });
});

describe('a mail the server refuses', () => {
  const failures = (): MockInstance<Logger['error']> =>
    vi.spyOn(Logger.prototype, 'error').mockImplementation((): void => undefined);

  it('is logged, not thrown, for a reset request', async () => {
    const logged = failures();
    const background = new BackgroundTasks();

    passwordReset(record, refusing(), background).request('a@example.com');
    await background.settled();

    expect(logged).toHaveBeenCalledWith('password reset link: ETIMEDOUT');
  });

  it('is logged, not thrown, for another verification link', async () => {
    const logged = failures();
    const background = new BackgroundTasks();
    const service = new EmailVerificationService(
      tokens,
      usersFinding(record),
      refusing(),
      background,
      config,
    );

    service.resend('a@example.com');
    await background.settled();

    expect(logged).toHaveBeenCalledWith('verification link: ETIMEDOUT');
  });

  it('is logged, and the sign-up still succeeds, for a new account', async () => {
    const logged = failures();
    const background = new BackgroundTasks();

    await expect(
      registration(undefined, refusing(), background).register(newAccount),
    ).resolves.toBeUndefined();
    await background.settled();

    expect(logged).toHaveBeenCalledWith('verification link: ETIMEDOUT');
  });

  it('is logged, and the sign-up still succeeds, for a taken address', async () => {
    const logged = failures();
    const background = new BackgroundTasks();

    await expect(
      registration(record, refusing(), background).register(newAccount),
    ).resolves.toBeUndefined();
    await background.settled();

    expect(logged).toHaveBeenCalledWith('account-exists notice: ETIMEDOUT');
  });
});
