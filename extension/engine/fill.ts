import { Cart, ShopClient } from '../carrefour/type';
import { FillResult, PlannedLine, ReportedEvent } from './type';

type Report = (event: ReportedEvent) => Promise<void>;

type ResolvedLine = PlannedLine & { ean: string; units: number };

// How many times a quantity is corrected before the line is called missing.
// Two covers both a wrong reading of the shop's counter and one stock refusal;
// beyond that the shop is saying no, not misunderstanding.
const CORRECTION_ROUNDS = 2;

const isResolved = (line: PlannedLine): line is ResolvedLine =>
  line.ean !== undefined && line.units !== undefined;

export class BasketFiller {
  constructor(private readonly shop: ShopClient) {}

  async run(planned: PlannedLine[], report: Report): Promise<FillResult> {
    const session = await this.shop.session();
    if (!session.signedIn) {
      await report({
        kind: 'BLOCKED',
        detail: 'Not signed in to the shop. Sign in yourself, then run this again.',
      });

      return {
        outcome: 'BLOCKED',
        productsAmount: 0,
        deliveryFees: 0,
        shortOfMinimum: 0,
        missing: [],
      };
    }

    await report({ kind: 'STARTED' });
    await this.emptyExisting(report);

    const resolved = planned.filter(isResolved);
    const unresolved = planned.filter((line): boolean => !isResolved(line));

    const filled = await this.settle(resolved, report);

    for (const line of unresolved) {
      await report({
        kind: 'LINE_MISSING',
        foodId: line.foodId,
        detail: 'No product on file for this food yet.',
      });
    }

    const missing = [
      ...this.shortfalls(resolved, filled),
      ...unresolved.map((line): string => line.foodId),
    ];

    await report({
      kind: 'FINISHED',
      detail: `${filled.productsAmount.toFixed(2)} € of groceries, ${missing.length} line(s) short.`,
    });

    return {
      outcome: 'SUCCEEDED',
      productsAmount: filled.productsAmount,
      deliveryFees: filled.deliveryFees,
      shortOfMinimum: filled.remainedAmount,
      missing,
    };
  }

  private async emptyExisting(report: Report): Promise<void> {
    const existing = await this.shop.cart();
    if (existing.lines.length === 0) {
      return;
    }

    await this.shop.empty();
    // Written down before it is thrown away: whatever was in there was put
    // there by a person, and they are entitled to know what went.
    await report({
      kind: 'CART_EMPTIED',
      detail: existing.lines.map((line): string => `${line.counter} x ${line.title}`).join(', '),
    });
  }

  // The shop's counter may be an amount or an increment, and a line may simply
  // refuse to go that high because the stock is not there. Rather than guess,
  // the cart is read back and the gap corrected — right under either reading,
  // and honest about the shortfall when the shop will not budge.
  private async settle(planned: ResolvedLine[], report: Report): Promise<Cart> {
    let cart = await this.shop.put(planned.map((line) => ({ ean: line.ean, counter: line.units })));

    for (let round = 0; round < CORRECTION_ROUNDS; round += 1) {
      const corrections = planned
        .filter((line): boolean => this.heldOf(cart, line.ean) !== line.units)
        .map((line) => ({ ean: line.ean, counter: line.units }));

      if (corrections.length === 0) {
        break;
      }

      cart = await this.shop.put(corrections);
    }

    for (const line of planned) {
      const held = this.heldOf(cart, line.ean);
      await report(
        held === line.units
          ? { kind: 'LINE_ADDED', foodId: line.foodId, label: line.productName }
          : {
              kind: 'LINE_MISSING',
              foodId: line.foodId,
              label: line.productName,
              detail: `Asked for ${line.units}, the shop gave ${held}.`,
            },
      );
    }

    return cart;
  }

  private shortfalls(planned: ResolvedLine[], cart: Cart): string[] {
    return planned
      .filter((line): boolean => this.heldOf(cart, line.ean) !== line.units)
      .map((line): string => line.foodId);
  }

  private heldOf(cart: Cart, ean: string): number {
    return cart.lines.find((line): boolean => line.ean === ean)?.counter ?? 0;
  }
}
