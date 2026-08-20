import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestContext } from '../../../infrastructure/http/request-context';
import { Admins } from './admins.service';

// Runs after AuthGuard, which is what puts the user on the request. Listed
// second in @UseGuards for that reason: alone it would find nobody and refuse
// everyone, which is safe but useless.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly admins: Admins) {}

  canActivate(context: ExecutionContext): boolean {
    const user = RequestContext.from(context)?.currentUser;

    // Says forbidden rather than not-found: hiding the route would be security
    // by obscurity, and the caller is already signed in — there is nothing left
    // to hide from them except the reports themselves.
    if (user === undefined || !this.admins.has(user.email)) {
      throw new ForbiddenException('This account is not an administrator.');
    }

    return true;
  }
}
