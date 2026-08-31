import type { Cart, CartLine, DeliverySlot, SearchHit, Session, ShopClient } from './type';

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
export const createCarrefourClient = (): ShopClient => {
  let serviceId = '';
  const subBasketType = 'drive_clcv';

  const isChallenge = (): boolean =>
    document.getElementById('challenge-form') !== null ||
    /vous n['’]êtes pas un robot|checking if the site connection is secure|cloudflare/i.test(
      document.title,
    );

  const readSession = (): Session => {
    // A Cloudflare "prove you are human" wall is not the shop: read nothing from
    // it. It has no sign-in control either, so a weaker heuristic would take it
    // for a signed-in page and act on it.
    if (isChallenge()) {
      return { signedIn: false, name: undefined };
    }

    const greeting = document.body.textContent?.match(/Bonjour\s+([\wÀ-ÿ-]+)/) ?? null;
    const accountControl = [...document.querySelectorAll('a, button')].some(
      (element): boolean =>
        /d[ée]connexion|se d[ée]connecter|mon compte/i.test(element.textContent ?? '') ||
        /logout|deconnexion|mon-compte|\/compte/i.test(element.getAttribute('href') ?? ''),
    );

    // Only a positive signal counts. Absence of a sign-in button is not proof —
    // an interstitial or a half-loaded header has none either, and reading that
    // as signed in fires a false report and a premature redirect.
    return { signedIn: greeting !== null || accountControl, name: greeting?.[1] };
  };

  // Without this header the site answers with its own HTML and a status that
  // looks like success. Reading that as JSON fails in a way that says nothing.
  const read = async <T>(path: string): Promise<T> => {
    const response = await fetch(path, { headers: JSON_HEADERS });

    return (await response.json()) as T;
  };

  const toLine = (product: RawProduct): CartLine => {
    const attributes = product.product?.attributes ?? {};

    return {
      ean: attributes.ean ?? '',
      title: attributes.title ?? '',
      counter: product.counter ?? 0,
      available: product.available !== false,
      outOfStock: product.isStockOff === true,
      price: product.totalItemPrice ?? 0,
    };
  };

  const toCart = (raw: RawCart): Cart => {
    const cart = raw.cart ?? {};
    const lines = (cart.items ?? []).flatMap((aisle): CartLine[] =>
      (aisle.products ?? []).map((product): CartLine => toLine(product)),
    );

    // Read back from whatever the cart holds rather than configured: it depends
    // on the delivery address and the service, which are the account's business.
    const fromProduct = (cart.items ?? [])
      .flatMap((aisle) => aisle.products ?? [])
      .find((product): boolean => product.product?.attributes?.offerServiceId !== undefined);
    const resolved = cart.facilityServiceId ?? fromProduct?.product?.attributes?.offerServiceId;
    if (resolved !== undefined) {
      serviceId = resolved;
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
      serviceId,
      subBasketType,
      slotBooked: cart.isSlotBooked === true,
    };
  };

  // There is no endpoint that answers this: /api/me returns 404 signed in or
  // out. The page is the honest source, but its header hydrates after load, so a
  // single read the moment the script runs can miss a signed-in account. Poll
  // briefly and trust a positive signal — a greeting or a sign-out control — the
  // instant it shows; only if none appears within a few seconds is the page read
  // as signed out.
  const session = async (): Promise<Session> => {
    const attempts = 10;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const verdict = readSession();
      if (verdict.signedIn || attempt === attempts - 1) {
        return verdict;
      }
      await new Promise((resolve): void => {
        setTimeout(resolve, 500);
      });
    }

    return readSession();
  };

  const cart = async (): Promise<Cart> => toCart(await read<RawCart>('/api/cart'));

  const empty = async (): Promise<void> => {
    await fetch('/api/cart', {
      method: 'DELETE',
      headers: { ...JSON_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ subBasketType, serviceId }),
    });
  };

  const put = async (items: { ean: string; counter: number }[]): Promise<Cart> => {
    const response = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { ...JSON_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({
        trackingRequest: { pageType: 'search', pageId: 'search' },
        items: items.map((item) => ({
          basketServiceId: serviceId,
          counter: item.counter,
          ean: item.ean,
          subBasketType,
        })),
      }),
    });

    return toCart((await response.json()) as RawCart);
  };

  // The results are rendered by the server, so the page itself is the answer.
  // There is no search endpoint to call.
  const search = async (terms: string): Promise<SearchHit[]> => {
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
  };

  // Every day the shop offers, flattened: the engine picks by time of day, not
  // by which column the site draws it in.
  const slots = async (): Promise<DeliverySlot[]> => {
    const raw = await read<RawSlots>(
      `/api/timeslots?facilityServiceId=${encodeURIComponent(serviceId)}`,
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
  };

  // Holding a slot lasts about twenty minutes, so it is taken once the basket
  // is filled and never before.
  const bookSlot = async (ref: string): Promise<void> => {
    await fetch('/api/cart/slot', {
      method: 'PUT',
      headers: { ...JSON_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ slotRef: ref, origin: 'timeslots', facilityServiceId: serviceId }),
    });
  };

  return { session, cart, empty, put, search, slots, bookSlot };
};
