import { Injectable, NotFoundException } from '@nestjs/common';
import { type DatabaseExecutor } from '../../infrastructure/database/token';
import { GroceryBasketLine } from './basket/model';
import { GroceryBasketRepository } from './basket/repository';
import { BasketTargetService } from './basket/target.service';
import { BasketLine, FoodNeed } from './basket/type';
import { CatalogAbsorber } from './catalog/absorber';
import { GroceryCatalogRepository } from './catalog/repository';
import { GroceryJobStatus } from './enum';
import { GroceryJob, GroceryJobEvent } from './job/model';
import { GroceryJobRepository } from './job/repository';
import { JobClosure, ReportedEvent } from './job/type';
import { GroceryPantryRepository } from './pantry/repository';
import { GroceryPreferenceRepository } from './preference/repository';
import { GroceryReportNotifier } from './report/notifier';
import { GrocerySlotRepository } from './slot/repository';

@Injectable()
export class GroceryService {
  constructor(
    private readonly jobs: GroceryJobRepository,
    private readonly basket: GroceryBasketRepository,
    private readonly catalog: GroceryCatalogRepository,
    private readonly pantry: GroceryPantryRepository,
    private readonly target: BasketTargetService,
    private readonly preferences: GroceryPreferenceRepository,
    private readonly windows: GrocerySlotRepository,
    private readonly absorber: CatalogAbsorber,
    private readonly notifier: GroceryReportNotifier,
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

  async history(userId: string): Promise<GroceryJob[]> {
    return this.jobs.listForUser(userId);
  }

  async detail(userId: string, jobId: string): Promise<GroceryJob | undefined> {
    const job = await this.jobs.findForUser(userId, jobId);

    return job === undefined ? undefined : this.withLines(job);
  }

  async claim(
    userId: string,
    deviceId: string,
    claimKey?: string,
  ): Promise<GroceryJob | undefined> {
    const job = await this.jobs.claimNext(userId, deviceId, claimKey);
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
    const closed = await this.jobs.finish(
      jobId,
      deviceId,
      { status, ...report },
      status === GroceryJobStatus.SUCCEEDED
        ? (executor): Promise<void> => this.restateWhatWasBought(closure, executor)
        : undefined,
    );
    if (closed === undefined) {
      throw new NotFoundException();
    }

    const detailed = await this.withLines(closed.job);
    if (!closed.justClosed) {
      return detailed;
    }

    this.notifier.tell(userId, detailed);

    return detailed;
  }

  // Closing a run is also when the cupboard is restated: a week that has been
  // bought leaves something behind, and without this the next order buys a
  // second bag of rice for the 40 g still on the shelf.
  private async restateWhatWasBought(
    closure: JobClosure,
    executor: DatabaseExecutor,
  ): Promise<void> {
    await this.absorber.absorb(closure.observations, executor);

    const lines = await this.basket.linesOf(closure.jobId);
    // A line the shop could not supply was never bought, so it must not be
    // counted as sitting in the cupboard.
    const bought = lines.filter((line): boolean => !closure.missingFoodIds.includes(line.foodId));
    await this.pantry.replace(closure.userId, this.target.leftoversAfter(bought), executor);
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
