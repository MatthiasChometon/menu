import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserMapper } from '../../user/mapper';
import { UserRepository } from '../../user/repository';
import { SessionCookie } from './cookie';
import { RequestContext } from '../../../infrastructure/http/request-context';
import { SessionPayload } from './type';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly cookie: SessionCookie,
    private readonly users: UserRepository,
    private readonly mapper: UserMapper,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = RequestContext.from(context);
    // Without a request there is no cookie to read, so there is nobody to let
    // through. Refusing is the only safe reading of it.
    if (request === undefined) {
      throw new UnauthorizedException();
    }

    const token = request.cookies?.[this.cookie.name];
    if (token === undefined) {
      throw new UnauthorizedException();
    }

    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    // The token can outlive the account it names, so the user is loaded rather
    // than trusted from the payload.
    const record = await this.users.findRecordById(payload.sub);
    if (record === undefined) {
      throw new UnauthorizedException();
    }

    // A JWT cannot be recalled once signed, so a reset bumps a counter and
    // every token carrying the old number stops working. Without this, changing
    // the password would leave whoever forced their way in as signed in as
    // before — which is the one thing a reset is for.
    if ((payload.ver ?? 0) !== record.sessionVersion) {
      throw new UnauthorizedException();
    }

    request.currentUser = this.mapper.toUser(record);
    return true;
  }
}
