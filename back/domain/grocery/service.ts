import { Injectable } from '@nestjs/common';
import { GroceryBasketLine } from './basket/model';
import { GroceryBasketRepository } from './basket/repository';
import { BasketTargetService } from './basket/target.service';
import { BasketLine, FoodNeed } from './basket/type';
import { GroceryCatalogRepository } from './catalog/repository';
import { GroceryJob } from './job/model';
import { GroceryJobRepository } from './job/repository';
import { GroceryPantryRepository } from './pantry/repository';

@Injectable()
export class GroceryService {
  constructor(
    private readonly jobs: GroceryJobRepository,
    private readonly basket: GroceryBasketRepository,
    private readonly catalog: GroceryCatalogRepository,
    private readonly pantry: GroceryPantryRepository,
    private readonly target: BasketTargetService,
  ) {}

  // The menu is worked out by the site, which has it prerendered; what to buy
  // is worked out here, where the products and the cupboard live. The basket is
  // settled now rather than when the browser picks the run up, so the report
  // stays readable against what was asked for.
  async queue(userId: string, weekOf: string, needs: FoodNeed[]): Promise<GroceryJob> {
    const [products, pantry] = await Promise.all([
      this.catalog.knownProducts(),
      this.pantry.forUser(userId),
    ]);

    const lines = this.target.linesFor(needs, pantry, products);
    const job = await this.jobs.create(userId, weekOf, undefined);
    await this.basket.saveLines(job.id, lines);

    return { ...job, lines: lines.map((line): GroceryBasketLine => this.toModel(line)) };
  }

  async detail(userId: string, jobId: string): Promise<GroceryJob | undefined> {
    const job = await this.jobs.findForUser(userId, jobId);

    return job === undefined ? undefined : this.withLines(job);
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
