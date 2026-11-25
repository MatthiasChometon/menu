import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCarrefourClient } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('booking a slot', () => {
  it('asks the shop once, even when it is slow to answer', async () => {
    const shop = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', shop);

    await expect(createCarrefourClient().bookSlot('slot-1')).rejects.toThrow('503');

    expect(shop).toHaveBeenCalledOnce();
  });

  it('fails when the shop refuses the slot, instead of reporting it booked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 409 })));

    await expect(createCarrefourClient().bookSlot('slot-1')).rejects.toThrow('409');
  });

  it('resolves when the shop accepts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));

    await expect(createCarrefourClient().bookSlot('slot-1')).resolves.toBeUndefined();
  });
});

describe('reading the shop when it answers with an error', () => {
  const refusing = (): void => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status: 500 }))),
    );
  };

  it.each([
    ['the cart', (): Promise<unknown> => createCarrefourClient().cart()],
    ['the slots', (): Promise<unknown> => createCarrefourClient().slots()],
    ['a search', (): Promise<unknown> => createCarrefourClient().search('riz')],
    ['emptying the cart', (): Promise<unknown> => createCarrefourClient().empty()],
    ['setting quantities', (): Promise<unknown> => createCarrefourClient().put([])],
  ])('fails on %s instead of reading an error page as an empty answer', async (_name, call) => {
    refusing();

    await expect(call()).rejects.toThrow('500');
  });

  it('does not retry the quantities, whose second application the shop may double', async () => {
    const shop = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', shop);

    await expect(createCarrefourClient().put([{ ean: '1', counter: 2 }])).rejects.toThrow('503');

    expect(shop).toHaveBeenCalledOnce();
  });
});
