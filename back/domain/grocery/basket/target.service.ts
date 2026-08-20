import { Injectable } from '@nestjs/common';
import { BasketLine, FoodNeed, KnownProduct } from './type';

@Injectable()
export class BasketTargetService {
  // What the menu asks for, minus what is already at home, turned into whole
  // products. Nobody buys 960 g of rice: they buy two boxes of 500 g and the
  // rest stays in the cupboard for next week, which is what the pantry then
  // holds.
  linesFor(
    needs: FoodNeed[],
    pantry: Map<string, number>,
    products: Map<string, KnownProduct>,
  ): BasketLine[] {
    return needs
      .map((need): BasketLine | undefined => this.lineFor(need, pantry, products))
      .filter((line): line is BasketLine => line !== undefined);
  }

  private lineFor(
    need: FoodNeed,
    pantry: Map<string, number>,
    products: Map<string, KnownProduct>,
  ): BasketLine | undefined {
    const grams = Math.round(need.grams);
    const fromPantry = Math.min(Math.round(pantry.get(need.foodId) ?? 0), grams);
    const missing = grams - fromPantry;
    if (missing === 0) {
      return undefined;
    }

    const product = products.get(need.foodId);

    // No product known means the run has to go looking for one, so the line is
    // carried through with no count rather than dropped.
    if (product === undefined) {
      return { foodId: need.foodId, label: need.label, grams, fromPantry };
    }

    return {
      foodId: need.foodId,
      label: need.label,
      grams,
      fromPantry,
      product,
      units: Math.ceil(missing / product.size),
    };
  }

  // What stays in the cupboard once the week has been cooked: the whole units
  // bought, plus what was already there, minus what the menu eats.
  leftoversAfter(lines: BasketLine[]): Map<string, number> {
    const leftovers = new Map<string, number>();

    for (const line of lines) {
      if (line.product === undefined || line.units === undefined) {
        continue;
      }

      const bought = line.units * line.product.size;
      leftovers.set(line.foodId, bought + line.fromPantry - line.grams);
    }

    return leftovers;
  }
}
