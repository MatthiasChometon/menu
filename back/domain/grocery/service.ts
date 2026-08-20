import { Injectable } from '@nestjs/common';
import { GroceryBasketLine } from './basket/model';
import { GroceryBasketRepository } from './basket/repository';
import { BasketTargetService } from './basket/target.service';
import { BasketLine, FoodNeed } from './basket/type';
import { GroceryCatalogRepository } from './catalog/repository';
import { GroceryJobStatus } from './enum';
import { GroceryJob } from './job/model';
import { GroceryJobRepository } from './job/repository';
import { JobReport } from './job/type';
import { GroceryPantryRepository } from './pantry/repository';
import { GroceryPreferenceRepository } from './preference/repository';

@Injectable()
export class GroceryService {
  constructor(
    private readonly jobs: GroceryJobRepository,
    private readonly basket: GroceryBasketRepository,
    private readonly catalog: GroceryCatalogRepository,
    private readonly pantry: GroceryPantryRepository,
    private readonly target: BasketTargetService,
    private readonly preferences: GroceryPreferenceRepository,
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
  ): Promise<GroceryJob | undefined> {
    const job = await this.jobs.finish(jobId, deviceId, status, report);
    if (job === undefined) {
      return undefined;
    }

    if (status === GroceryJobStatus.SUCCEEDED) {
      const lines = await this.basket.linesOf(jobId);
      // A line the shop could not supply was never bought, so it must not be
      // counted as sitting in the cupboard.
      const bought = lines.filter((line): boolean => !missingFoodIds.includes(line.foodId));
      await this.pantry.replace(userId, this.target.leftoversAfter(bought));
    }

    return this.withLines(job);
  }

  async claim(userId: string, deviceId: string): Promise<GroceryJob | undefined> {
    const job = await this.jobs.claimNext(userId, deviceId);

    return job === undefined ? undefined : this.withLines(job);
  }

  private async withLines(job: GroceryJob): Promise<GroceryJob> {
    const lines = await this.basket.linesOf(job.id);

    return { ...job, lines: lines.map((line): GroceryBasketLine => this.toModel(line)) };
  }

  private toModel(line: BasketLine): GroceryBasketLine {
    return {
      foodId: line.foodId,
      grams: line.grams,
      fromPantry: line.fromPantry,
      ean: line.product?.ean,
      productName: line.product?.name,
      unitSize: line.product?.size,
      units: line.units,
    };
  }
}
