import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/module';
import { SessionCookie } from './currentUser/cookie';
import { AuthGuard } from './currentUser/guard';
import { EmailAndPasswordController } from './emailAndPassword/controller';
import { GoogleController } from './google/controller';
import { GoogleOAuth } from './google/service';
import { PasswordService } from './emailAndPassword/password.service';
import { AuthResolver } from './resolver';
import { AuthService } from './service';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [EmailAndPasswordController, GoogleController],
  providers: [AuthService, AuthResolver, AuthGuard, PasswordService, SessionCookie, GoogleOAuth],
  // JwtModule and UserModule go out too: @UseGuards(AuthGuard) has Nest build
  // the guard inside the module that uses it, so that module must be able to
  // resolve the guard's own dependencies.
  exports: [AuthGuard, SessionCookie, JwtModule, UserModule],
})
export class AuthModule {}
