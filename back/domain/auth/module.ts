import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/module';
import { EmailAllowlist } from './allowlist.service';
import { sessionSecret } from './secret';
import { SessionCookie } from './currentUser/cookie';
import { AuthGuard } from './currentUser/guard';
import { EmailAndPasswordController } from './emailAndPassword/controller';
import { EmailVerificationController } from './emailVerification/controller';
import { EmailVerificationService } from './emailVerification/service';
import { AuthTokenRepository } from './emailVerification/repository';
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
        secret: sessionSecret(config),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [EmailAndPasswordController, EmailVerificationController, GoogleController],
  providers: [
    AuthService,
    AuthResolver,
    AuthGuard,
    PasswordService,
    SessionCookie,
    GoogleOAuth,
    EmailAllowlist,
    EmailVerificationService,
    AuthTokenRepository,
  ],
  // JwtModule and UserModule go out too: @UseGuards(AuthGuard) has Nest build
  // the guard inside the module that uses it, so that module must be able to
  // resolve the guard's own dependencies.
  exports: [AuthGuard, SessionCookie, JwtModule, UserModule],
})
export class AuthModule {}
