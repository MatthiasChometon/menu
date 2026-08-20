import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORT } from './token';
import type { MailTransport } from './token.type';
import { MailMessage } from './type';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    private readonly config: ConfigService,
  ) {}

  // A run that filled the basket has done its job even if the mail bounces, so
  // a failure here is written down rather than thrown: losing the notification
  // must not lose the order.
  async send(message: MailMessage): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.config.get<string>('MAIL_FROM'),
        ...message,
      });
    } catch (error: unknown) {
      this.logger.error(`Could not send "${message.subject}" to ${message.to}`, error);
    }
  }
}
