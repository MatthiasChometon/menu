// Draws the PWA icons (iOS/Android home screen + favicon) from the shared plate
// motif (asset/utils/icon). drawIcon() renders the PNG bytes; main() writes them.
//
// Usage: pnpm --dir front icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { FAVICON_SVG, PLATE_PALETTE, plateWedges } from '../utils/icon';
import { SEO_PUBLIC } from './paths';

const SIZES: Record<string, number> = {
  'pwa-192x192.png': 192,
  'pwa-512x512.png': 512,
  'apple-touch-icon.png': 180,
};

const SUPERSAMPLE = 4;

// The icon at `size`px, drawn 4x then resized down for crisp edges.
export const drawIcon = async (size: number): Promise<Buffer> => {
  const big = size * SUPERSAMPLE;
  const canvas = createCanvas(big, big);
  const ctx = canvas.getContext('2d');
  const center = big / 2;

  const gradient = ctx.createLinearGradient(0, 0, 0, big);
  gradient.addColorStop(0, PLATE_PALETTE.top);
  gradient.addColorStop(1, PLATE_PALETTE.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, big, big);

  const disc = (radius: number, fill: string): void => {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };

  disc(big * 0.34, PLATE_PALETTE.plate);
  plateWedges().forEach((wedge, index): void => {
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, big * 0.24, wedge.start, wedge.end);
    ctx.closePath();
    ctx.fillStyle = PLATE_PALETTE.wedges[index]!;
    ctx.fill();
  });
  disc(big * 0.06, PLATE_PALETTE.plate);

  return sharp(canvas.toBuffer('image/png')).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
};

const main = async (): Promise<void> => {
  mkdirSync(SEO_PUBLIC, { recursive: true });
  for (const [name, size] of Object.entries(SIZES)) {
    writeFileSync(join(SEO_PUBLIC, name), await drawIcon(size));
    console.log(`${name} (${size}x${size})`);
  }
  writeFileSync(join(SEO_PUBLIC, 'favicon.svg'), FAVICON_SVG, 'utf8');
  console.log('favicon.svg');
};

if (process.argv[1]?.endsWith('icons.ts')) await main();
