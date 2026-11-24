import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { MailService } from './service';
import { MAIL_TRANSPORT, type MailTransport } from './token';

const transportProvider: Provider = {
  provide: MAIL_TRANSPORT,
  useFactory: (config: ConfigService): MailTransport => {
    const host = config.get<string>('MAIL_HOST');

    // No server configured is fine in a checkout and fatal in production: a
    // deployment that cannot send is a deployment where nobody can finish
    // signing up, and nothing about it looks wrong until someone tries.
    if (host === undefined || host.trim().length === 0) {
      if (config.get<string>('NODE_ENV') === 'production') {
        throw new Error('MAIL_HOST is unset. Without it no account can ever be verified.');
      }
      return null;
    }

    const user = config.get<string>('MAIL_USER');
    const pass = config.get<string>('MAIL_PASS');

    return createTransport({
      host,
      port: Number(config.get<string>('MAIL_PORT') ?? 465),
      // Implicit TLS on 465. The host has to be the name the certificate was
      // issued for, not the one the mailbox lives under, or the handshake
      // fails on a name mismatch that reads like an authentication problem.
      secure: config.get<string>('MAIL_SECURE') !== 'false',
      auth: user === undefined ? undefined : { user, pass },
    });
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [transportProvider, MailService],
  exports: [MailService],
})
export class MailInfrastructureModule {}
