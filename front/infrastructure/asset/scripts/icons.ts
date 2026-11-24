// Draws the PWA icons (iOS/Android home screen + favicon) from the shared plate
// motif (scripts/plate). drawIcon() renders the PNG bytes; main() writes them.
//
// Usage: pnpm --dir front icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { drawPlate } from './drawPlate';
import { FAVICON_SVG, PLATE_PALETTE } from './plate';
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

  drawPlate(ctx, {
    centerX: center,
    centerY: center,
    plateRadius: big * 0.34,
    wedgeRadius: big * 0.24,
    holeRadius: big * 0.06,
  });

  return sharp(canvas.toBuffer('image/png'))
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
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
