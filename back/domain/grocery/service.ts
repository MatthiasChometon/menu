import { Injectable, Logger } from '@nestjs/common';
import { GroceryBasketLine } from './basket/model';
import { GroceryBasketRepository } from './basket/repository';
import { BasketTargetService } from './basket/target.service';
import { BasketLine, FoodNeed } from './basket/type';
import { GroceryCatalogRepository } from './catalog/repository';
import { PriceSighting } from './catalog/type';
import { GroceryJobEventKind, GroceryJobStatus } from './enum';
import { GroceryJob } from './job/model';
import { GroceryJobRepository } from './job/repository';
import { JobReport } from './job/type';
import { GroceryPantryRepository } from './pantry/repository';
import { GroceryPreferenceRepository } from './preference/repository';
import { GroceryPushRepository } from './push/repository';
import { GroceryReportMail } from './report/mail';
import { PushService } from '../../infrastructure/push/service';
import { GrocerySlotRepository } from './slot/repository';
import { MailService } from '../../infrastructure/mail/service';
import { UserRepository } from '../user/repository';
import { ConfigService } from '@nestjs/config';

type ObservedSighting = PriceSighting & { size?: number };

@Injectable()
export class GroceryService {
  private readonly logger = new Logger(GroceryService.name);

  constructor(
    private readonly jobs: GroceryJobRepository,
    private readonly basket: GroceryBasketRepository,
    private readonly catalog: GroceryCatalogRepository,
    private readonly pantry: GroceryPantryRepository,
    private readonly target: BasketTargetService,
    private readonly preferences: GroceryPreferenceRepository,
    private readonly windows: GrocerySlotRepository,
    private readonly mail: MailService,
    private readonly reportMail: GroceryReportMail,
    private readonly users: UserRepository,
    private readonly config: ConfigService,
    private readonly push: PushService,
    private readonly subscriptions: GroceryPushRepository,
  ) {}

  // The menu is worked out by the site, which has it prerendered; what to buy
  // is worked out here, where the products and the cupboard live. The basket is
  // settled now rather than when the browser picks the run up, so the report
  // stays readable against what was asked for.
  async queue(userId: string, weekOf: string, needs: FoodNeed[]): Promise<GroceryJob> {
    const [products, pantry, preference] = await Promise.all([
      this.catalog.knownProducts(),
      this.pantry.forUser(userId),
      this.preferences.forUser(userId),
    ]);

    const lines = this.target.linesFor(needs, pantry, products);
    // Copied onto the run rather than read at display time: the report has to
    // say what it was measured against, not what the settings happen to say now.
    const job = await this.jobs.create(userId, weekOf, preference.alertThresholdCents);
    await this.basket.saveLines(job.id, lines);

    return { ...job, lines: lines.map((line): GroceryBasketLine => this.toModel(line)) };
  }

  async detail(userId: string, jobId: string): Promise<GroceryJob | undefined> {
    const job = await this.jobs.findForUser(userId, jobId);

    return job === undefined ? undefined : this.withLines(job);
  }

  // Closing a run is also when the cupboard is restated: a week that has been
  // bought leaves something behind, and without this the next order buys a
  // second bag of rice for the 40 g still on the shelf.
  async close(
    jobId: string,
    deviceId: string,
    userId: string,
    status: GroceryJobStatus,
    report: JobReport,
    missingFoodIds: string[],
    observations: ObservedSighting[],
  ): Promise<GroceryJob | undefined> {
    const job = await this.jobs.finish(jobId, deviceId, status, report);
    if (job === undefined) {
      return undefined;
    }

    if (status === GroceryJobStatus.SUCCEEDED) {
      await this.absorb(observations);
      const lines = await this.basket.linesOf(jobId);
      // A line the shop could not supply was never bought, so it must not be
      // counted as sitting in the cupboard.
      const bought = lines.filter((line): boolean => !missingFoodIds.includes(line.foodId));
      await this.pantry.replace(userId, this.target.leftoversAfter(bought));
    }

    const detailed = await this.withLines(job);
    await this.notify(userId, detailed);

    return detailed;
  }

  // Told once the run is closed, whatever became of it: a run that stopped for
  // a captcha is exactly the one somebody needs to hear about.
  private async notify(userId: string, job: GroceryJob): Promise<void> {
    const account = await this.users.findById(userId);
    if (account === undefined) {
      return;
    }

    const basketUrl =
      this.config.get<string>('SHOP_BASKET_URL') ?? 'https://www.carrefour.fr/courses';
    const message = this.reportMail.build(account.email, job, basketUrl);

    // Both go out at once: a phone that has notifications on gets the short
    // version now, the mail carries the detail. Neither waits on the other.
    //
    // A failure to send is swallowed here rather than in the mail layer, which
    // is right to throw for a verification link nobody will ever receive. This
    // one is a notification about work already done: losing it must not lose
    // the order it was telling somebody about.
    const [, gone] = await Promise.all([
      this.mail.send(message).catch((error: unknown): void => {
        this.logger.warn(`Could not send the report to ${account.email}`, error);
      }),
      this.push.send(await this.subscriptions.forUser(userId), {
        title: message.subject,
        body: this.pushBodyOf(job),
        url: basketUrl,
      }),
    ]);

    await Promise.all(gone.map((endpoint): Promise<void> => this.subscriptions.forget(endpoint)));
  }

  private pushBodyOf(job: GroceryJob): string {
    const shortfalls = job.events.filter(
      (event): boolean =>
        event.kind === GroceryJobEventKind.LINE_MISSING ||
        event.kind === GroceryJobEventKind.LINE_SUBSTITUTED,
    ).length;
    const total =
      job.productsCents === undefined ? '' : `${(job.productsCents / 100).toFixed(2)} € · `;

    return `${total}${shortfalls} ligne(s) à regarder. À toi de vérifier et de payer.`;
  }

  // A substitute states what a unit holds, so it becomes the product of
  // reference outright. A product already on file only ever hands back a
  // price: the cart says what a line cost, never what a unit contains.
  private async absorb(observations: ObservedSighting[]): Promise<void> {
    const withSize = observations.filter(
      (seen): seen is ObservedSighting & { size: number } => seen.size !== undefined,
    );
    const priceOnly = observations.filter((seen): boolean => seen.size === undefined);

    await Promise.all([
      this.catalog.record(
        withSize.map((seen) => ({
          foodId: seen.foodId,
          ean: seen.ean,
          name: seen.name,
          size: seen.size,
          priceCents: seen.priceCents,
        })),
      ),
      this.catalog.recordPrices(priceOnly),
    ]);
  }

  async claim(userId: string, deviceId: string): Promise<GroceryJob | undefined> {
    const job = await this.jobs.claimNext(userId, deviceId);
    if (job === undefined) {
      return undefined;
    }

    const [detailed, slotWindows] = await Promise.all([
      this.withLines(job),
      this.windows.forUser(userId),
    ]);

    return { ...detailed, slotWindows };
  }

  private async withLines(job: GroceryJob): Promise<GroceryJob> {
    const lines = await this.basket.linesOf(job.id);

    return { ...job, lines: lines.map((line): GroceryBasketLine => this.toModel(line)) };
  }

  private toModel(line: BasketLine): GroceryBasketLine {
    return {
      foodId: line.foodId,
      label: line.label,
      grams: line.grams,
      fromPantry: line.fromPantry,
      ean: line.product?.ean,
      productName: line.product?.name,
      unitSize: line.product?.size,
      units: line.units,
    };
  }
}
