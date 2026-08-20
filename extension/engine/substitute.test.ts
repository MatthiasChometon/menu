import { describe, expect, it } from 'vitest';
import { Cart, SearchHit, Session, ShopClient } from '../carrefour/type';
import { Substituter } from './substitute';
import { PlannedLine } from './type';

const shopOffering = (hits: SearchHit[]): ShopClient => ({
  session: (): Promise<Session> => Promise.resolve({ signedIn: true }),
  cart: (): Promise<Cart> => Promise.reject(new Error('not needed')),
  empty: (): Promise<void> => Promise.reject(new Error('not needed')),
  put: (): Promise<Cart> => Promise.reject(new Error('not needed')),
  search: (): Promise<SearchHit[]> => Promise.resolve(hits),
  slots: (): Promise<[]> => Promise.resolve([]),
  bookSlot: (): Promise<void> => Promise.reject(new Error('not needed')),
});

const line = (overrides: Partial<PlannedLine> = {}): PlannedLine => ({
  foodId: 'brownRice',
  grams: 960,
  fromPantry: 0,
  productName: "Riz Complet CARREFOUR CLASSIC'",
  label: 'Riz complet',
  unitSize: 500,
  ...overrides,
});

const hit = (title: string, packaging: string, ean = '111'): SearchHit => ({
  ean,
  title,
  packaging,
});

describe('finding a stand-in product', () => {
  it('refuses a candidate that drops what the menu insisted on', async () => {
    const shop = shopOffering([hit('Riz Long Grain BEN’S', 'le paquet de 500g')]);

    const found = await new Substituter(shop).findFor(line());

    expect(found).toBeUndefined();
  });

  it('takes a candidate that keeps every word of the reference', async () => {
    const shop = shopOffering([
      hit('Riz Long Grain', 'le paquet de 500g', '111'),
      hit('Riz Complet Bio CARREFOUR', 'le paquet de 500g', '222'),
    ]);

    const found = await new Substituter(shop).findFor(line());

    expect(found).toEqual(expect.objectContaining({ ean: '222', size: 500 }));
  });

  it('prefers the format the menu was written against', async () => {
    const shop = shopOffering([
      hit('Riz Complet CARREFOUR', 'le paquet de 1kg', '111'),
      hit('Riz Complet CARREFOUR BIO', 'le paquet de 500g', '222'),
    ]);

    const found = await new Substituter(shop).findFor(line());

    expect(found?.ean).toBe('222');
  });

  it('turns down a product whose content the shop never states', async () => {
    const shop = shopOffering([hit('Riz Complet CARREFOUR', 'la boite', '111')]);

    const found = await new Substituter(shop).findFor(line());

    expect(found).toBeUndefined();
  });

  it('falls back on how the menu names the food when no product is on file', async () => {
    const shop = shopOffering([hit('Tofu nature BJORG', 'le bloc de 200g', '333')]);

    const found = await new Substituter(shop).findFor(
      line({
        foodId: 'tofu',
        productName: undefined,
        unitSize: undefined,
        label: 'Tofu nature',
      }),
    );

    expect(found).toEqual(expect.objectContaining({ ean: '333', size: 200 }));
  });

  it('has nothing to search on when the food has no name at all', async () => {
    const shop = shopOffering([hit('Tofu nature', 'le bloc de 200g')]);

    const found = await new Substituter(shop).findFor(
      line({ productName: undefined, label: undefined }),
    );

    expect(found).toBeUndefined();
  });

  it('says nothing when the shelves come back empty', async () => {
    const found = await new Substituter(shopOffering([])).findFor(line());

    expect(found).toBeUndefined();
  });
});
