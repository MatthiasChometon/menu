import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/model';
import { UserMapper } from '../user/mapper';
import { UserRepository } from '../user/repository';
import { PasswordService } from './emailAndPassword/password.service';
import { LoginInput, RegisterInput } from './emailAndPassword/input';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly mapper: UserMapper,
    private readonly jwt: JwtService,
  ) {}

  async register({ email, password, name }: RegisterInput): Promise<User> {
    const existing = await this.users.findRecordByEmail(email);
    if (existing !== undefined) {
      throw new ConflictException('This email address is already registered.');
    }

    const passwordHash = await this.passwords.hash(password);
    return this.users.create(email, passwordHash, name);
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

    return this.mapper.toUser(record);
  }

  signSession(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }
}
