import { Cart, CartLine, SearchHit, Session, ShopClient } from './type';

type RawCart = {
  cart?: {
    items?: { products?: RawProduct[] }[];
    totalAmount?: number;
    totalAmountWithoutServices?: number;
    remainedAmount?: number;
    deliveryFees?: number;
    facilityServiceId?: string;
    isSlotBooked?: boolean;
  };
};

type RawProduct = {
  counter?: number;
  totalItemPrice?: number;
  available?: boolean;
  isStockOff?: boolean;
  product?: { attributes?: { ean?: string; title?: string; offerServiceId?: string } };
};

type RawSession = { firstname?: string; email?: string; isConnected?: boolean };

const JSON_HEADERS = { accept: 'application/json' };

// Runs inside a carrefour.fr page. That is not a detail: from the extension's
// own origin the session cookies are third-party and never sent, so the same
// calls would come back signed out.
export class CarrefourClient implements ShopClient {
  private serviceId = '';
  private subBasketType = 'drive_clcv';

  async session(): Promise<Session> {
    const raw = await this.read<RawSession>('/api/me');
    const name = raw.firstname;

    return { signedIn: raw.isConnected === true || name !== undefined, name };
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
      productsAmount: cart.totalAmountWithoutServices ?? 0,
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
