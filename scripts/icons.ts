// Draws the PWA icons (iOS/Android home screen + favicon): a plate seen from
// above on a lime gradient, three coloured wedges standing for protein / carbs /
// fat. drawIcon() returns the PNG bytes; main() writes the files.
//
// Usage: pnpm icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { PUBLIC_DIR } from './lib/paths.ts';

const SIZES: Record<string, number> = {
  'pwa-192x192.png': 192,
  'pwa-512x512.png': 512,
  'apple-touch-icon.png': 180,
};

const TOP = '#84cc16';
const BOTTOM = '#3f6212';
const PLATE = '#ffffff';
const SLICES = ['#ecfccb', '#bef264', '#65a30d'];
const SUPERSAMPLE = 4;

const deg = (value: number): number => (value * Math.PI) / 180;

/** The icon at `size`px, drawn 4× then resized down for crisp edges. */
export const drawIcon = async (size: number): Promise<Buffer> => {
  const big = size * SUPERSAMPLE;
  const canvas = createCanvas(big, big);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, big);
  gradient.addColorStop(0, TOP);
  gradient.addColorStop(1, BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, big, big);

  const c = big / 2;
  const disc = (radius: number, fill: string): void => {
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };

  disc(big * 0.34, PLATE);
  const foodRadius = big * 0.24;
  SLICES.forEach((colour, index) => {
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, foodRadius, deg(-90 + index * 120), deg(-90 + (index + 1) * 120));
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
  });
  disc(big * 0.06, PLATE);

  return sharp(canvas.toBuffer('image/png')).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
};

const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#84cc16"/><stop offset="1" stop-color="#3f6212"/>' +
  '</linearGradient></defs>' +
  '<rect width="64" height="64" rx="14" fill="url(#g)"/>' +
  '<circle cx="32" cy="32" r="21" fill="#fff"/>' +
  '<path d="M32 15a17 17 0 0 1 14.7 8.5L32 32Z" fill="#ecfccb"/>' +
  '<path d="M46.7 23.5a17 17 0 0 1 0 17L32 32Z" fill="#bef264"/>' +
  '<path d="M46.7 40.5A17 17 0 0 1 17.3 40.5L32 32Z" fill="#65a30d"/>' +
  '<circle cx="32" cy="32" r="7" fill="#fff"/>' +
  '</svg>\n';

const main = async (): Promise<void> => {
  mkdirSync(PUBLIC_DIR, { recursive: true });
  for (const [name, size] of Object.entries(SIZES)) {
    writeFileSync(join(PUBLIC_DIR, name), await drawIcon(size));
    console.log(`${name} (${size}x${size})`);
  }
  writeFileSync(join(PUBLIC_DIR, 'favicon.svg'), FAVICON_SVG, 'utf8');
  console.log('favicon.svg');
};

if (process.argv[1]?.endsWith('icons.ts')) await main();
