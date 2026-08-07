import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    const user = await this.users.findById(payload.sub);
    if (user === undefined) {
      throw new UnauthorizedException();
    }

    request.currentUser = user;
    return true;
  }
}
