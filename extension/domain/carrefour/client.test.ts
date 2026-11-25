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
