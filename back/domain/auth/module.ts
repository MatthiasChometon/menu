import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/module';
import { SessionCookie } from './currentUser/cookie';
import { AuthGuard } from './currentUser/guard';
import { EmailAndPasswordController } from './emailAndPassword/controller';
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
  controllers: [EmailAndPasswordController],
  providers: [AuthService, AuthResolver, AuthGuard, PasswordService, SessionCookie],
  exports: [AuthGuard, SessionCookie],
})
export class AuthModule {}
