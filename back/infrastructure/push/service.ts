import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendNotification, setVapidDetails, WebPushError } from 'web-push';
import { PushDelivery, PushRecipient } from './type';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  // Returns the recipients the push service says are gone, so the caller can
  // stop writing to browsers that no longer exist.
  async send(recipients: PushRecipient[], delivery: PushDelivery): Promise<string[]> {
    if (!this.ready() || recipients.length === 0) {
      return [];
    }

    const results = await Promise.all(
      recipients.map(async (recipient): Promise<string | undefined> => {
        try {
          await sendNotification(recipient, JSON.stringify(delivery));
          return undefined;
        } catch (error: unknown) {
          if (
            error instanceof WebPushError &&
            (error.statusCode === 404 || error.statusCode === 410)
          ) {
            return recipient.endpoint;
          }

          this.logger.warn(`Push to ${recipient.endpoint.slice(0, 40)}… failed`, error);
          return undefined;
        }
      }),
    );

    return results.filter((endpoint): endpoint is string => endpoint !== undefined);
  }

  // Without keys there is no push at all, and that is a perfectly ordinary way
  // to run: the mail still goes out.
  private ready(): boolean {
    if (this.configured) {
      return true;
    }

    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT');
    if (!publicKey || !privateKey || !subject) {
      return false;
    }

    setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
    return true;
  }
}
