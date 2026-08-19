import {
  ConflictException,
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

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly mapper: UserMapper,
    private readonly jwt: JwtService,
    private readonly allowlist: EmailAllowlist,
    private readonly verification: EmailVerificationService,
  ) {}

  async register({ email, password, name, locale }: RegisterInput): Promise<void> {
    // Checked before anything is looked up or hashed: an uninvited address must
    // not even learn whether it already has an account here.
    this.allowlist.assertAllowed(email);

    const existing = await this.users.findRecordByEmail(email);
    if (existing !== undefined) {
      throw new ConflictException('This email address is already registered.');
    }

    const passwordHash = await this.passwords.hash(password);
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
