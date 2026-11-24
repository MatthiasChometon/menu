import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackgroundTasks } from '../../../infrastructure/background/service';
import { reasonOf } from '../../../infrastructure/errors/reason';
import { MailService } from '../../../infrastructure/mail/service';
import { PushService } from '../../../infrastructure/push/service';
import { UserRepository } from '../../user/repository';
import { GroceryJob } from '../job/model';
import { shortfallsOf } from '../job/utils';
import { GroceryPushRepository } from '../push/repository';
import { GroceryReportMail } from './mail';
import { euros } from './utils';

const DEFAULT_BASKET_URL = 'https://www.carrefour.fr/courses';

@Injectable()
export class GroceryReportNotifier {
  private readonly logger = new Logger(GroceryReportNotifier.name);

  constructor(
    private readonly background: BackgroundTasks,
    private readonly users: UserRepository,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly reportMail: GroceryReportMail,
    private readonly push: PushService,
    private readonly subscriptions: GroceryPushRepository,
  ) {}

  // Told once the run is closed, whatever became of it: a run that stopped for
  // a captcha is exactly the one somebody needs to hear about. It goes out in
  // the background, so a slow mail server cannot hold the browser waiting. The
  // work is already done: a report that cannot be sent must lose nothing.
  tell(userId: string, job: GroceryJob): void {
    this.background.run(`Could not tell user ${userId} about job ${job.id}`, () =>
      this.sendReport(userId, job),
    );
  }

  private async sendReport(userId: string, job: GroceryJob): Promise<void> {
    const account = await this.users.findById(userId);
    if (account === undefined) {
      return;
    }

    const basketUrl = this.config.get<string>('SHOP_BASKET_URL') ?? DEFAULT_BASKET_URL;
    const message = this.reportMail.build(account.email, job, basketUrl);

    // A phone that has notifications on gets the short version, the mail
    // carries the detail. Neither waits on, nor fails, the other.
    const [, gone] = await Promise.all([
      this.mail.send(message).catch((error: unknown): void => {
        this.logger.warn(`Could not send the report of job ${job.id}: ${reasonOf(error)}`);
      }),
      this.push.send(await this.subscriptions.forUser(userId), {
        title: message.subject,
        body: this.pushBodyOf(job),
        url: basketUrl,
      }),
    ]);

    await this.dropDeadSubscriptions(gone);
  }

  private async dropDeadSubscriptions(endpoints: string[]): Promise<void> {
    await Promise.all(
      endpoints.map((endpoint): Promise<void> => this.subscriptions.forget(endpoint)),
    );
  }

  private pushBodyOf(job: GroceryJob): string {
    const total = job.productsCents === undefined ? '' : `${euros(job.productsCents)} · `;

    return `${total}${shortfallsOf(job.events).length} ligne(s) à regarder. À toi de vérifier et de payer.`;
  }
}
