import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORT, type MailMessage, type MailTransport } from './token';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    private readonly config: ConfigService,
  ) {}

  // Resolves when the server has accepted the message and rejects when it has
  // not (or stays silent past the transport timeouts). Callers on a request that
  // an anonymous visitor can make run it through BackgroundTasks, so that a
  // refusal is logged and a slow server cannot show in the response time.
  async send(message: MailMessage): Promise<void> {
    if (this.transport === null) {
      // A local checkout with no mail server still has to be usable, and the
      // link still has to be reachable — so it goes where the developer is
      // already looking. Production refuses to boot in this state instead.
      this.logger.log(`Mail not sent (no mail server configured) — ${message.subject}`);
      this.logger.log(message.text);
      return;
    }

    await this.transport.sendMail({
      from: this.config.getOrThrow<string>('MAIL_FROM'),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
