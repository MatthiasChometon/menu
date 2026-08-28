import { Cart, CartLine, DeliverySlot, SearchHit, Session, ShopClient } from './type';

type RawCart = {
  cart?: {
    items?: { products?: RawProduct[] }[];
    totalAmount?: number;
    totalProductsPrice?: number;
    totalAvailableQuantity?: number;
    remainingAmountToNextDeliveryFeeThreshold?: number | null;
    remainedAmount?: number;
    deliveryFees?: number;
    facilityServiceId?: string;
    isSlotBooked?: boolean;
    slot?: { expiresInMinutes?: number | null };
  };
};

type RawProduct = {
  counter?: number;
  totalItemPrice?: number;
  available?: boolean;
  isStockOff?: boolean;
  product?: { attributes?: { ean?: string; title?: string; offerServiceId?: string } };
};

type RawCell = {
  ref?: string;
  available?: boolean;
  selected?: boolean;
  fees?: number | null;
  date?: { begin?: string; end?: string; cutoff?: string | null };
};

type RawSlots = { timeslots?: { availableDay?: boolean; cells?: RawCell[] }[] };

const JSON_HEADERS = { accept: 'application/json' };

// Runs inside a carrefour.fr page. That is not a detail: from the extension's
// own origin the session cookies are third-party and never sent, so the same
// calls would come back signed out.
export class CarrefourClient implements ShopClient {
  private serviceId = '';
  private subBasketType = 'drive_clcv';

  // There is no endpoint that answers this: /api/me returns 404 signed in or
  // out. The page is the honest source, but its header hydrates after load, so a
  // single read the moment the script runs can miss a signed-in account. Poll
  // briefly and trust a positive signal — a greeting or a sign-out control — the
  // instant it shows; only if none appears within a few seconds is the page read
  // as signed out.
  async session(): Promise<Session> {
    const attempts = 10;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const verdict = this.readSession();
      if (verdict.signedIn || attempt === attempts - 1) {
        return verdict;
      }
      await new Promise((resolve): void => {
        setTimeout(resolve, 500);
      });
    }

    return this.readSession();
  }

  private readSession(): Session {
    const controls = [...document.querySelectorAll('a, button')];
    const greeting = document.body.textContent?.match(/Bonjour\s+([\wÀ-ÿ-]+)/) ?? null;
    const signInControl = controls.some((element): boolean =>
      /me connecter|se connecter/i.test(element.textContent ?? ''),
    );
    const signOutControl = controls.some(
      (element): boolean =>
        /d[ée]connexion|se d[ée]connecter/i.test(element.textContent ?? '') ||
        /logout|deconnexion/i.test(element.getAttribute('href') ?? ''),
    );

    return {
      // A greeting or a sign-out control is proof of a session; absence of a
      // sign-in control is the weaker fallback for a page that shows neither.
      signedIn: greeting !== null || signOutControl || !signInControl,
      name: greeting?.[1],
    };
  }

  async cart(): Promise<Cart> {
    return this.toCart(await this.read<RawCart>('/api/cart'));
  }

  async empty(): Promise<void> {
    await fetch('/api/cart', {
      method: 'DELETE',
      headers: { ...JSON_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ subBasketType: this.subBasketType, serviceId: this.serviceId }),
    });
  }

  async put(items: { ean: string; counter: number }[]): Promise<Cart> {
    const response = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { ...JSON_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({
        trackingRequest: { pageType: 'search', pageId: 'search' },
        items: items.map((item) => ({
          basketServiceId: this.serviceId,
          counter: item.counter,
          ean: item.ean,
          subBasketType: this.subBasketType,
        })),
      }),
    });

    return this.toCart((await response.json()) as RawCart);
  }

  // The results are rendered by the server, so the page itself is the answer.
  // There is no search endpoint to call.
  async search(terms: string): Promise<SearchHit[]> {
    const response = await fetch(`/s?q=${encodeURIComponent(terms)}`);
    const document = new DOMParser().parseFromString(await response.text(), 'text/html');

    return [...document.querySelectorAll('article[data-testId]')]
      .map((card): SearchHit | undefined => {
        const ean = card.getAttribute('data-testId');
        if (ean === null) {
          return undefined;
        }

        return {
          ean,
          title: card.querySelector('h3')?.textContent?.trim() ?? '',
          packaging: card.querySelector('[class*="packaging"]')?.textContent?.trim() ?? '',
        };
      })
      .filter((hit): hit is SearchHit => hit !== undefined);
  }

  // Every day the shop offers, flattened: the engine picks by time of day, not
  // by which column the site draws it in.
  async slots(): Promise<DeliverySlot[]> {
    const raw = await this.read<RawSlots>(
      `/api/timeslots?facilityServiceId=${encodeURIComponent(this.serviceId)}`,
    );

    return (raw.timeslots ?? [])
      .filter((day): boolean => day.availableDay !== false)
      .flatMap((day): RawCell[] => day.cells ?? [])
      .map((cell): DeliverySlot => ({
        ref: cell.ref ?? '',
        begin: cell.date?.begin ?? '',
        end: cell.date?.end ?? '',
        cutoff: cell.date?.cutoff ?? undefined,
        available: cell.available !== false,
        selected: cell.selected === true,
        feesCents:
          cell.fees === null || cell.fees === undefined ? undefined : Math.round(cell.fees * 100),
      }))
      .filter((slot): boolean => slot.ref !== '' && slot.begin !== '');
  }

  // Holding a slot lasts about twenty minutes, so it is taken once the basket
  // is filled and never before.
  async bookSlot(ref: string): Promise<void> {
    await fetch('/api/cart/slot', {
      method: 'PUT',
      headers: { ...JSON_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({
        slotRef: ref,
        origin: 'timeslots',
        facilityServiceId: this.serviceId,
      }),
    });
  }

  // Without this header the site answers with its own HTML and a status that
  // looks like success. Reading that as JSON fails in a way that says nothing.
  private async read<T>(path: string): Promise<T> {
    const response = await fetch(path, { headers: JSON_HEADERS });

    return (await response.json()) as T;
  }

  private toCart(raw: RawCart): Cart {
    const cart = raw.cart ?? {};
    const lines = (cart.items ?? []).flatMap((aisle): CartLine[] =>
      (aisle.products ?? []).map((product): CartLine => this.toLine(product)),
    );

    // Read back from whatever the cart holds rather than configured: it depends
    // on the delivery address and the service, which are the account's business.
    const fromProduct = (cart.items ?? [])
      .flatMap((aisle) => aisle.products ?? [])
      .find((product): boolean => product.product?.attributes?.offerServiceId !== undefined);
    const serviceId = cart.facilityServiceId ?? fromProduct?.product?.attributes?.offerServiceId;
    if (serviceId !== undefined) {
      this.serviceId = serviceId;
    }

    return {
      lines,
      totalAmount: cart.totalAmount ?? 0,
      // totalAmountWithoutServices looks like the groceries and is not: on a
      // real basket it came back equal to the total, fees included. This one is
      // the sub-total the shop itself prints.
      productsAmount: cart.totalProductsPrice ?? 0,
      itemCount: cart.totalAvailableQuantity ?? 0,
      toNextFeeThreshold: cart.remainingAmountToNextDeliveryFeeThreshold ?? undefined,
      slotHeldMinutes: cart.slot?.expiresInMinutes ?? undefined,
      remainedAmount: cart.remainedAmount ?? 0,
      deliveryFees: cart.deliveryFees ?? 0,
      serviceId: this.serviceId,
      subBasketType: this.subBasketType,
      slotBooked: cart.isSlotBooked === true,
    };
  }

  private toLine(product: RawProduct): CartLine {
    const attributes = product.product?.attributes ?? {};

    return {
      ean: attributes.ean ?? '',
      title: attributes.title ?? '',
      counter: product.counter ?? 0,
      available: product.available !== false,
      outOfStock: product.isStockOff === true,
      price: product.totalItemPrice ?? 0,
    };
  }
}
