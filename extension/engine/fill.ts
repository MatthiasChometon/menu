import { Cart, ShopClient } from '../carrefour/type';
import { chooseSlot, SlotWindow } from './slot';
import { Substituter } from './substitute';
import { FillResult, PlannedLine, ReportedEvent, Sighting } from './type';

type Report = (event: ReportedEvent) => Promise<void>;

// substituteSize is set only when this line came from a search: a substitute
// states what a unit holds, a product already on file keeps the size it has,
// and the cart never says either way.
type ResolvedLine = PlannedLine & { ean: string; units: number; substituteSize?: number };

// How many times a quantity is corrected before the line is called missing.
// Two covers both a wrong reading of the shop's counter and one stock refusal;
// beyond that the shop is saying no, not misunderstanding.
const CORRECTION_ROUNDS = 2;

const isResolved = (line: PlannedLine): line is ResolvedLine =>
  line.ean !== undefined && line.units !== undefined;

export class BasketFiller {
  private readonly substituter: Substituter;

  constructor(private readonly shop: ShopClient) {
    this.substituter = new Substituter(shop);
  }

  async run(planned: PlannedLine[], windows: SlotWindow[], report: Report): Promise<FillResult> {
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
        sightings: [],
      };
    }

    await report({ kind: 'STARTED' });
    await this.emptyExisting(report);

    const known = planned.filter(isResolved);
    const substituted = await this.substituteAll(
      planned.filter((line): boolean => !isResolved(line)),
      report,
    );
    const resolved = [...known, ...substituted.found];

    const filled = await this.settle(resolved, report);

    const missing = [
      ...this.shortfalls(resolved, filled),
      ...substituted.giveUp.map((line): string => line.foodId),
    ];

    // Only now: holding a slot lasts about twenty minutes, so taking one before
    // the basket is filled would risk losing it halfway through.
    await this.book(windows, report);

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
      sightings: this.sightingsOf(resolved, filled),
    };
  }

  // A food with no product on file, or one the shop stopped selling, is worth
  // looking for rather than dropping — but only a candidate that says
  // everything the reference said is accepted, and every one is reported so it
  // can be refused.
  private async substituteAll(
    lines: PlannedLine[],
    report: Report,
  ): Promise<{ found: ResolvedLine[]; giveUp: PlannedLine[] }> {
    const found: ResolvedLine[] = [];
    const giveUp: PlannedLine[] = [];

    for (const line of lines) {
      const match = await this.substituter.findFor(line);
      if (match === undefined) {
        giveUp.push(line);
        await report({
          kind: 'LINE_MISSING',
          foodId: line.foodId,
          detail: 'No product on file, and nothing close enough on the shelves.',
        });
        continue;
      }

      const missing = line.grams - line.fromPantry;
      found.push({
        ...line,
        ean: match.ean,
        productName: match.title,
        unitSize: match.size,
        substituteSize: match.size,
        units: Math.ceil(missing / match.size),
      });

      await report({
        kind: 'LINE_SUBSTITUTED',
        foodId: line.foodId,
        label: match.title,
        detail: `Chosen in place of the usual product, ${match.size} per unit.`,
      });
    }

    return { found, giveUp };
  }

  private async book(windows: SlotWindow[], report: Report): Promise<void> {
    const offered = await this.shop.slots();
    const chosen = chooseSlot(offered, windows, new Date());

    if (chosen === undefined) {
      await report({
        kind: 'SLOT_UNAVAILABLE',
        detail:
          windows.length === 0
            ? 'No delivery window set, so no slot was taken.'
            : `None of the ${offered.length} slots on offer fits the windows set.`,
      });
      return;
    }

    await this.shop.bookSlot(chosen.ref);
    await report({ kind: 'SLOT_BOOKED', detail: `${chosen.begin} to ${chosen.end}` });
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

  // Read off the cart rather than off the plan: what is wanted here is what
  // the shop charged today, which is the whole point of looking.
  private sightingsOf(planned: ResolvedLine[], cart: Cart): Sighting[] {
    return planned
      .map((line): Sighting | undefined => {
        const held = cart.lines.find((entry): boolean => entry.ean === line.ean);
        if (held === undefined || held.counter === 0) {
          return undefined;
        }

        return {
          foodId: line.foodId,
          ean: line.ean,
          name: held.title,
          priceCents: Math.round((held.price / held.counter) * 100),
          size: line.substituteSize,
        };
      })
      .filter((seen): seen is Sighting => seen !== undefined);
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
