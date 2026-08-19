import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../../infrastructure/mail/service';
import { User } from '../../user/model';
import { UserRepository } from '../../user/repository';
import { verificationEmail } from './emails';
import { AuthTokenRepository, EMAIL_VERIFICATION } from './repository';

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
    private readonly config: ConfigService,
  ) {}

  async send(userId: string, email: string, locale: string): Promise<void> {
    const token = await this.tokens.issue(userId, EMAIL_VERIFICATION, TTL_MS);
    const front = this.config.getOrThrow<string>('FRONT_URL').replace(/\/+$/, '');
    const url = `${front}${VERIFICATION_PATH}?token=${token}`;

    await this.mail.send(verificationEmail(email, url, locale));
  }

  /** Spends the link and returns the account it belonged to, now verified. */
  async verify(token: string): Promise<User> {
    const userId = await this.tokens.consume(token, EMAIL_VERIFICATION);
    if (userId === undefined) {
      throw new UnauthorizedException('This link is no longer valid. Ask for a new one.');
    }

    return this.users.markEmailVerified(userId);
  }

  /** Sends another link, and says nothing about whether there was anyone to
   *  send it to: the caller is not signed in, so answering honestly would turn
   *  this route into a way to test which addresses have accounts. */
  async resend(email: string): Promise<void> {
    const record = await this.users.findRecordByEmail(email);
    if (record === undefined || record.emailVerifiedAt !== null) return;

    await this.send(record.id, record.email, record.locale);
  }
}
