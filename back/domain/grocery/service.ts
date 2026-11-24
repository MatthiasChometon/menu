import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../infrastructure/mail/service';
import { PushService } from '../../infrastructure/push/service';
import { UserRepository } from '../user/repository';
import { GroceryBasketLine } from './basket/model';
import { GroceryBasketRepository } from './basket/repository';
import { BasketTargetService } from './basket/target.service';
import { BasketLine, FoodNeed } from './basket/type';
import { GroceryCatalogRepository } from './catalog/repository';
import { ObservedProduct, ObservedSighting } from './catalog/type';
import { GroceryJobStatus } from './enum';
import { GroceryJob, GroceryJobEvent } from './job/model';
import { GroceryJobRepository } from './job/repository';
import { JobClosure, ReportedEvent } from './job/type';
import { shortfallsOf } from './job/utils';
import { GroceryPantryRepository } from './pantry/repository';
import { GroceryPreferenceRepository } from './preference/repository';
import { GroceryPushRepository } from './push/repository';
import { GroceryReportMail } from './report/mail';
import { GrocerySlotRepository } from './slot/repository';

const DEFAULT_BASKET_URL = 'https://www.carrefour.fr/courses';

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
    const job = await this.jobs.create({
      userId,
      weekOf,
      alertThresholdCents: preference.alertThresholdCents,
      lines,
    });

    return { ...job, lines: lines.map((line): GroceryBasketLine => this.toModel(line)) };
  }

  async detail(userId: string, jobId: string): Promise<GroceryJob | undefined> {
    const job = await this.jobs.findForUser(userId, jobId);

    return job === undefined ? undefined : this.withLines(job);
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

  async reportEvent(
    jobId: string,
    deviceId: string,
    event: ReportedEvent,
  ): Promise<GroceryJobEvent> {
    const recorded = await this.jobs.appendEvent(jobId, deviceId, event);
    if (recorded === undefined) {
      throw new NotFoundException();
    }

    return recorded;
  }

  async close(closure: JobClosure): Promise<GroceryJob> {
    const { jobId, deviceId, userId, status, report } = closure;
    const job = await this.jobs.finish(jobId, deviceId, { status, ...report });
    if (job === undefined) {
      throw new NotFoundException();
    }

    if (status === GroceryJobStatus.SUCCEEDED) {
      await this.restateWhatWasBought(closure);
    }

    const detailed = await this.withLines(job);
    await this.notifyWithoutFailing(userId, detailed);

    return detailed;
  }

  // Closing a run is also when the cupboard is restated: a week that has been
  // bought leaves something behind, and without this the next order buys a
  // second bag of rice for the 40 g still on the shelf.
  private async restateWhatWasBought(closure: JobClosure): Promise<void> {
    await this.absorb(closure.observations);

    const lines = await this.basket.linesOf(closure.jobId);
    // A line the shop could not supply was never bought, so it must not be
    // counted as sitting in the cupboard.
    const bought = lines.filter((line): boolean => !closure.missingFoodIds.includes(line.foodId));
    await this.pantry.replace(closure.userId, this.target.leftoversAfter(bought));
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
        this.lastSightingPerFood(withSize).map((seen): ObservedProduct =>
          this.toObservedProduct(seen),
        ),
      ),
      this.catalog.recordPrices(priceOnly),
    ]);
  }

  // One statement upserts the whole list, and Postgres refuses to touch the
  // same row twice in one statement: a food reported twice keeps its last word.
  private lastSightingPerFood<Sighting extends ObservedSighting>(
    sightings: Sighting[],
  ): Sighting[] {
    return [...new Map(sightings.map((seen): [string, Sighting] => [seen.foodId, seen])).values()];
  }

  private toObservedProduct(seen: ObservedSighting & { size: number }): ObservedProduct {
    return {
      foodId: seen.foodId,
      ean: seen.ean,
      name: seen.name,
      size: seen.size,
      priceCents: seen.priceCents,
    };
  }

  // The run is already closed and the cupboard already restated: a report that
  // cannot be sent must not turn that success into an error for the browser.
  private async notifyWithoutFailing(userId: string, job: GroceryJob): Promise<void> {
    try {
      await this.notify(userId, job);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Could not tell user ${userId} about job ${job.id}: ${reason}`);
    }
  }

  // Told once the run is closed, whatever became of it: a run that stopped for
  // a captcha is exactly the one somebody needs to hear about.
  private async notify(userId: string, job: GroceryJob): Promise<void> {
    const account = await this.users.findById(userId);
    if (account === undefined) {
      return;
    }

    const basketUrl = this.config.get<string>('SHOP_BASKET_URL') ?? DEFAULT_BASKET_URL;
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
        const reason = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Could not send the report of job ${job.id}: ${reason}`);
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
    const total =
      job.productsCents === undefined ? '' : `${(job.productsCents / 100).toFixed(2)} € · `;

    return `${total}${shortfallsOf(job.events).length} ligne(s) à regarder. À toi de vérifier et de payer.`;
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
