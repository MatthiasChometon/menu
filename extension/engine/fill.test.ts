import { describe, expect, it } from 'vitest';
import { Cart, CartLine, DeliverySlot, SearchHit, ShopClient, Session } from '../carrefour/type';
import { BasketFiller } from './fill';
import { PlannedLine, ReportedEvent } from './type';

const RICE: PlannedLine = {
  foodId: 'brownRice',
  grams: 960,
  fromPantry: 0,
  ean: '3560070510771',
  productName: "Riz Complet CARREFOUR CLASSIC'",
  unitSize: 500,
  units: 2,
};

type ShopOptions = {
  /** How the shop reads counter: as a quantity, or as something to add on. */
  counter: 'absolute' | 'increment';
  signedIn?: boolean;
  /** Most a given barcode can reach, whatever is asked. */
  stockCap?: Record<string, number>;
  startsWith?: CartLine[];
  slots?: DeliverySlot[];
};

// A stand-in shop, which is the point of the exercise: the engine must come out
// right whichever way this one reads counter.
const fakeShop = (
  options: ShopOptions,
): ShopClient & { held: Map<string, number>; state: { emptied: number; booked?: string } } => {
  const held = new Map<string, number>(
    (options.startsWith ?? []).map((line): [string, number] => [line.ean, line.counter]),
  );
  const titles = new Map<string, string>(
    (options.startsWith ?? []).map((line): [string, string] => [line.ean, line.title]),
  );
  const state: { emptied: number; booked?: string } = { emptied: 0 };

  const cartOf = (): Cart => ({
    lines: [...held.entries()].map(([ean, counter]): CartLine => ({
      ean,
      title: titles.get(ean) ?? `Product ${ean}`,
      counter,
      available: true,
      outOfStock: false,
      price: 1.79 * counter,
    })),
    totalAmount: 0,
    itemCount: [...held.values()].reduce((total, counter): number => total + counter, 0),
    productsAmount: [...held.values()].reduce(
      (total, counter): number => total + 1.79 * counter,
      0,
    ),
    remainedAmount: 0,
    deliveryFees: 0,
    serviceId: '1415-151-900733',
    subBasketType: 'drive_clcv',
    slotBooked: false,
  });

  const shop = {
    session: (): Promise<Session> => Promise.resolve({ signedIn: options.signedIn ?? true }),
    cart: (): Promise<Cart> => Promise.resolve(cartOf()),
    empty: (): Promise<void> => {
      held.clear();
      state.emptied += 1;
      return Promise.resolve();
    },
    put: (items: { ean: string; counter: number }[]): Promise<Cart> => {
      for (const item of items) {
        const wanted =
          options.counter === 'absolute' ? item.counter : (held.get(item.ean) ?? 0) + item.counter;
        const cap = options.stockCap?.[item.ean] ?? Number.POSITIVE_INFINITY;
        held.set(item.ean, Math.min(wanted, cap));
      }

      return Promise.resolve(cartOf());
    },
    search: (): Promise<SearchHit[]> => Promise.resolve([]),
    slots: (): Promise<DeliverySlot[]> => Promise.resolve(options.slots ?? []),
    bookSlot: (ref: string): Promise<void> => {
      state.booked = ref;
      return Promise.resolve();
    },
  };

  return { ...shop, held, state };
};

const collect = (): {
  report: (event: ReportedEvent) => Promise<void>;
  events: ReportedEvent[];
} => {
  const events: ReportedEvent[] = [];

  return {
    events,
    report: (event: ReportedEvent): Promise<void> => {
      events.push(event);
      return Promise.resolve();
    },
  };
};

describe('filling a basket whatever the shop means by counter', () => {
  it('lands on the right quantity when counter is a quantity', async () => {
    const shop = fakeShop({ counter: 'absolute' });
    const { report, events } = collect();

    const result = await new BasketFiller(shop).run([RICE], [], report);

    expect(shop.held.get(RICE.ean!)).toBe(2);
    expect(result.missing).toEqual([]);
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'LINE_ADDED', foodId: 'brownRice' }),
    );
  });

  it('lands on the right quantity when counter is an increment', async () => {
    const shop = fakeShop({ counter: 'increment' });
    const { report } = collect();

    const result = await new BasketFiller(shop).run([RICE], [], report);

    expect(shop.held.get(RICE.ean!)).toBe(2);
    expect(result.missing).toEqual([]);
  });
});

describe('when the shop will not give what was asked', () => {
  it('reports the line short rather than pretending', async () => {
    const shop = fakeShop({ counter: 'absolute', stockCap: { [RICE.ean!]: 1 } });
    const { report, events } = collect();

    const result = await new BasketFiller(shop).run([RICE], [], report);

    expect(result.missing).toEqual(['brownRice']);
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'LINE_MISSING', detail: 'Asked for 2, the shop gave 1.' }),
    );
  });

  it('keeps what it did manage to put in', async () => {
    const shop = fakeShop({ counter: 'absolute', stockCap: { [RICE.ean!]: 1 } });
    const { report } = collect();

    await new BasketFiller(shop).run([RICE], [], report);

    expect(shop.held.get(RICE.ean!)).toBe(1);
  });
});

describe('starting from a basket someone already filled', () => {
  it('empties it first, so a run twice does not buy twice', async () => {
    const shop = fakeShop({
      counter: 'increment',
      startsWith: [
        {
          ean: RICE.ean!,
          title: 'Rice',
          counter: 2,
          available: true,
          outOfStock: false,
          price: 3.58,
        },
      ],
    });
    const { report } = collect();

    await new BasketFiller(shop).run([RICE], [], report);

    expect(shop.state.emptied).toBe(1);
    expect(shop.held.get(RICE.ean!)).toBe(2);
  });

  it('writes down what it threw away', async () => {
    const shop = fakeShop({
      counter: 'absolute',
      startsWith: [
        {
          ean: '999',
          title: 'Chocolate',
          counter: 3,
          available: true,
          outOfStock: false,
          price: 6,
        },
      ],
    });
    const { report, events } = collect();

    await new BasketFiller(shop).run([RICE], [], report);

    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'CART_EMPTIED', detail: '3 x Chocolate' }),
    );
  });
});

describe('what it refuses to do', () => {
  it('stops rather than signing in', async () => {
    const shop = fakeShop({ counter: 'absolute', signedIn: false });
    const { report, events } = collect();

    const result = await new BasketFiller(shop).run([RICE], [], report);

    expect(result.outcome).toBe('BLOCKED');
    expect(shop.held.size).toBe(0);
    expect(events).toEqual([expect.objectContaining({ kind: 'BLOCKED' })]);
  });

  it('carries a food with no product on file instead of dropping it', async () => {
    const shop = fakeShop({ counter: 'absolute' });
    const { report, events } = collect();

    const result = await new BasketFiller(shop).run(
      [{ foodId: 'tofu', grams: 400, fromPantry: 0 }],
      [],
      report,
    );

    expect(result.missing).toEqual(['tofu']);
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'LINE_MISSING', foodId: 'tofu' }),
    );
  });
});

describe('what the run brings back about the products', () => {
  it('reports the price of one unit, not of the line', async () => {
    const shop = fakeShop({ counter: 'absolute' });
    const { report } = collect();

    // The fake charges 1.79 a unit and the plan asks for two.
    const result = await new BasketFiller(shop).run([RICE], [], report);

    expect(result.sightings).toEqual([
      expect.objectContaining({ foodId: 'brownRice', priceCents: 179 }),
    ]);
  });

  it('says nothing of a size for a product already on file', async () => {
    const shop = fakeShop({ counter: 'absolute' });
    const { report } = collect();

    const result = await new BasketFiller(shop).run([RICE], [], report);

    expect(result.sightings[0].size).toBeUndefined();
  });

  it('leaves out a line the shop never supplied', async () => {
    const shop = fakeShop({ counter: 'absolute', stockCap: { [RICE.ean!]: 0 } });
    const { report } = collect();

    const result = await new BasketFiller(shop).run([RICE], [], report);

    expect(result.sightings).toEqual([]);
  });
});
