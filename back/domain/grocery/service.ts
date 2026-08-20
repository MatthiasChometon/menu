import { Injectable } from '@nestjs/common';
import { GroceryBasketLine } from './basket/model';
import { GroceryBasketRepository } from './basket/repository';
import { BasketTargetService } from './basket/target.service';
import { BasketLine, FoodNeed } from './basket/type';
import { GroceryCatalogRepository } from './catalog/repository';
import { PriceSighting } from './catalog/type';
import { GroceryJobStatus } from './enum';
import { GroceryJob } from './job/model';
import { GroceryJobRepository } from './job/repository';
import { JobReport } from './job/type';
import { GroceryPantryRepository } from './pantry/repository';
import { GroceryPreferenceRepository } from './preference/repository';
import { GrocerySlotRepository } from './slot/repository';

type ObservedSighting = PriceSighting & { size?: number };

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

    return this.withLines(job);
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
