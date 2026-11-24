import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../../infrastructure/mail/service';
import { User } from '../../user/model';
import { UserMapper } from '../../user/mapper';
import { UserRepository } from '../../user/repository';
import { PasswordService } from '../emailAndPassword/password.service';
import { frontUrl } from '../front-url';
import { AuthTokenRepository, PASSWORD_RESET } from '../tokens/repository';
import { passwordResetEmail } from './emails';

// An hour. Shorter than a verification link, because this one changes a
// password rather than confirming an address, and because somebody asking for
// it is at their keyboard right now.
const TTL_MS = 60 * 60 * 1000;

const RESET_PATH = '/reinitialisation';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly tokens: AuthTokenRepository,
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly mapper: UserMapper,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Sends a link, and says nothing about whether there was anyone to send it
   *  to. The caller is not signed in, so an honest answer would turn this into
   *  a way to test which addresses have accounts here. */
  async request(email: string): Promise<void> {
    const record = await this.users.findRecordByEmail(email);
    if (record === undefined) return;

    const token = await this.tokens.issue(record.id, PASSWORD_RESET, TTL_MS);
    const url = `${frontUrl(this.config)}${RESET_PATH}?token=${token}`;

    await this.mail.send(passwordResetEmail(record.email, url, record.locale));
  }

  /** Spends the link and sets the new password. Every session signed before now
   *  stops working, which is the point: a reset exists for the case where
   *  somebody else is already inside. */
  async reset(token: string, password: string): Promise<User> {
    // A made-up token is refused before any hashing: scrypt is the slow step and
    // a request with a well-formed random token must not get it for free.
    if (!(await this.tokens.isLive(token, PASSWORD_RESET))) throw this.invalidLink();

    // Hashed before the link is spent: scrypt must not keep a transaction open
    // while it runs.
    const passwordHash = await this.passwords.hash(password);

    // Spent in the same transaction that sets the password: a failure in
    // between leaves the link usable rather than burnt for nothing.
    const record = await this.tokens.spend(token, PASSWORD_RESET, (userId, executor) =>
      this.users.replacePassword(userId, passwordHash, executor),
    );
    if (record === undefined) throw this.invalidLink();

    // Through the mapper, always: a REST reply serialises whatever object it is
    // handed, and the raw row carries the password hash.
    return this.mapper.toUser(record);
  }

  private invalidLink(): UnauthorizedException {
    return new UnauthorizedException('This link is no longer valid. Ask for a new one.');
  }
}
