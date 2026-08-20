import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { MailService } from './service';
import { MAIL_TRANSPORT } from './token';
import type { MailTransport } from './token.type';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailTransport => {
        const user = config.get<string>('MAIL_USER');
        const pass = config.get<string>('MAIL_PASS');

        return createTransport({
          host: config.get<string>('MAIL_HOST') ?? 'localhost',
          port: Number(config.get<string>('MAIL_PORT') ?? 1025),
          // o2switch answers on 465 with implicit TLS; a local catcher has none.
          secure: config.get<string>('MAIL_SECURE') === 'true',
          // A local mail catcher takes no credentials at all, and passing empty
          // ones makes it refuse the connection.
          auth: user === undefined || user === '' ? undefined : { user, pass },
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailInfrastructureModule {}
