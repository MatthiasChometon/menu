import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { User } from '../user/model';
import { CurrentUser } from './currentUser/current-user';
import { AuthGuard } from './currentUser/guard';
import { AuthService } from './service';

@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Query(() => User, { description: 'The signed-in user.' })
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User): User {
    return user;
  }

  // Public, on purpose: the sign-in prompt hides the Google button when Google
  // is not configured (a fresh dev checkout), so it is never shown broken.
  @Query(() => Boolean, { description: 'Whether Google sign-in is configured.' })
  googleEnabled(): boolean {
    return this.auth.isGoogleEnabled();
  }
}
