import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { User } from '../user/model';
import { CurrentUser } from './currentUser/current-user';
import { AuthGuard } from './currentUser/guard';

@Resolver(() => User)
export class AuthResolver {
  @Query(() => User, { description: 'The signed-in user.' })
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User): User {
    return user;
  }
}
