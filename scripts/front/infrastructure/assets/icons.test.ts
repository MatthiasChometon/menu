import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { drawIcon } from './icons.ts';

describe('drawIcon', () => {
  it('produces a square PNG at the requested size', async () => {
    const meta = await sharp(await drawIcon(192)).metadata();

    expect(meta.format).toBe('png');
    expect(meta.width).toBe(192);
    expect(meta.height).toBe(192);
  });

  it('honours a different size', async () => {
    const meta = await sharp(await drawIcon(180)).metadata();

    expect(meta.width).toBe(180);
    expect(meta.height).toBe(180);
  });
});
