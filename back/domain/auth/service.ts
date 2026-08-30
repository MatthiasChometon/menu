import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/model';
import { UserMapper } from '../user/mapper';
import { UserRepository } from '../user/repository';
import { EmailAllowlist } from './allowlist.service';
import { PasswordService } from './emailAndPassword/password.service';
import { LoginInput, RegisterInput } from './emailAndPassword/input';
import { EmailVerificationService } from './emailVerification/service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../infrastructure/mail/service';
import { accountExistsEmail } from './emailAndPassword/emails';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly mapper: UserMapper,
    private readonly jwt: JwtService,
    private readonly allowlist: EmailAllowlist,
    private readonly verification: EmailVerificationService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async register({ email, password, name, locale }: RegisterInput): Promise<void> {
    // Checked before anything is looked up or hashed: an uninvited address must
    // not even learn whether it already has an account here.
    this.allowlist.assertAllowed(email);

    // Hashed before the existence check, always: it is the one slow step, and
    // doing it on both paths keeps a taken address from answering faster than a
    // free one. Response time must not become the enumeration the status code
    // no longer is.
    const passwordHash = await this.passwords.hash(password);

    const existing = await this.users.findRecordByEmail(email);
    if (existing !== undefined) {
      // The same 202 a real sign-up gets — telling a stranger the address is
      // taken is exactly the account list not to hand out. The one thing that
      // differs is a note to the address's real owner, saying somebody tried
      // and what to do if it was them.
      const front = this.config.getOrThrow<string>('FRONT_URL').replace(/\/+$/, '');
      await this.mail.send(accountExistsEmail(existing.email, existing.locale, front));
      return;
    }

    const record = await this.users.create(email, passwordHash, name, locale);

    // No session comes back from here. Handing one out would make the
    // verification decorative: anybody could open an account on somebody
    // else's address and use it while the real owner deleted the mail.
    await this.verification.send(record.id, record.email, record.locale);
  }

  async login({ email, password }: LoginInput): Promise<User> {
    const record = await this.users.findRecordByEmail(email);

    // One message for both branches: saying which one failed would tell an
    // attacker whether the address has an account.
    if (record?.passwordHash === undefined || record.passwordHash === null) {
      throw new UnauthorizedException('Wrong email or password.');
    }
    if (!(await this.passwords.verify(password, record.passwordHash))) {
      throw new UnauthorizedException('Wrong email or password.');
    }

    // Checked after the password, never before: a 403 says the address has an
    // account here, and only somebody who already typed the right password has
    // earned that answer. The front tells the two apart to offer a new link.
    if (record.emailVerifiedAt === null) {
      throw new ForbiddenException('Confirm your email address before signing in.');
    }

    // Said plainly rather than as a wrong password: somebody shut out deserves
    // to know it is over and stop trying, and the guard would refuse every call
    // a moment later anyway.
    if (record.blockedAt !== null) {
      throw new ForbiddenException('This account has been blocked.');
    }

    return this.mapper.toUser(record);
  }

  // The counter is read here rather than passed in, so no caller can forget it:
  // a token signed without one reads as version zero and would survive the very
  // reset meant to retire it.
  async signSession(userId: string): Promise<string> {
    const record = await this.users.findRecordById(userId);
    if (record === undefined) throw new UnauthorizedException();

    return this.jwt.signAsync({ sub: userId, ver: record.sessionVersion });
  }
}
