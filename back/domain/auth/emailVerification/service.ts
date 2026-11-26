import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackgroundTasks } from '../../../infrastructure/background/service';
import { MailService } from '../../../infrastructure/mail/service';
import { User } from '../../user/model';
import { UserRepository } from '../../user/repository';
import { frontUrl } from '../front-url';
import { verificationEmail } from './emails';
import { AuthTokenRepository, EMAIL_VERIFICATION } from '../tokens/repository';

// A day. Long enough that a link found the next morning still works, short
// enough that one left in an old inbox does not.
const TTL_MS = 24 * 60 * 60 * 1000;

const VERIFICATION_PATH = '/verification';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly tokens: AuthTokenRepository,
    private readonly users: UserRepository,
    private readonly mail: MailService,
    private readonly background: BackgroundTasks,
    private readonly config: ConfigService,
  ) {}

  async send(userId: string, email: string, locale: string): Promise<void> {
    const token = await this.tokens.issue(userId, EMAIL_VERIFICATION, TTL_MS);
    const url = `${frontUrl(this.config)}${VERIFICATION_PATH}?token=${token}`;

    await this.mail.send(verificationEmail(email, url, locale));
  }

  /** Spends the link and returns the account it belonged to, now verified. */
  async verify(token: string): Promise<User> {
    // Spent in the same transaction that verifies the account: a failure in
    // between leaves the link usable rather than burnt for nothing.
    const verified = await this.tokens.spend(token, EMAIL_VERIFICATION, (userId, executor) =>
      this.users.markEmailVerified(userId, executor),
    );
    if (verified === undefined) {
      throw new UnauthorizedException('This link is no longer valid. Ask for a new one.');
    }

    return verified;
  }

  /** Sends another link, and says nothing about whether there was anyone to
   *  send it to: the caller is not signed in, so answering honestly would turn
   *  this route into a way to test which addresses have accounts. Everything
   *  that differs between the two cases (the token, the mail, a slow or dead
   *  mail server) happens after the answer has gone, so neither the content nor
   *  the response time tells them apart. */
  resend(email: string): void {
    this.background.run('verification link', async (): Promise<void> => {
      const record = await this.users.findRecordByEmail(email);
      if (record === undefined || record.emailVerifiedAt !== null) return;

      await this.send(record.id, record.email, record.locale);
    });
  }
}
