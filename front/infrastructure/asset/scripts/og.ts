// Draws the link-preview (Open Graph) cards: the shared plate motif plus the
// brand/tagline/lead read from the site's own translations, one per language.
// wrap() is pure and tested (asset/utils/og); this runner does the render.
//
// Usage: pnpm --dir front og
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { PLATE_PALETTE, plateWedges } from '../utils/icon';
import { wrap } from '../utils/og';
import { FRONT, SEO_PUBLIC } from './paths';

const TRANSLATION_DIR = join(FRONT, 'domain', 'menu', 'translation');
const WIDTH = 1200;
const HEIGHT = 630;
const SUPERSAMPLE = 2;
// The Balance palette, so a shared link reads like the app: a warm off-white
// title, a turmeric accent for the tagline, a soft forest tint for the lead —
// no more of the lime the first draft carried.
const TITLE_COLOUR = '#f7f8f4';
const TAGLINE_COLOUR = '#e0a94e';
const LEAD_COLOUR = '#d6ebd9';

// The app's own faces, bundled so the card renders the same on a Linux CI as it
// does here: Instrument Serif for the title (the display face every page heads
// with), Instrument Sans for the rest. System fonts stay as the last resort.
const FONT_DIR = join(FRONT, 'infrastructure', 'asset', 'fonts');
const FONT_CANDIDATES: Record<string, string[]> = {
  serif: [join(FONT_DIR, 'InstrumentSerif-Regular.ttf'), 'C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'],
  sans: [join(FONT_DIR, 'InstrumentSans-Regular.ttf'), 'C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'],
};

// Register the first candidate that exists under a stable family; fall back to
// the platform default when none is found (e.g. a Linux CI without these fonts).
const family = (weight: string): string => {
  const label = `OG-${weight}`;
  for (const path of FONT_CANDIDATES[weight]!) {
    if (existsSync(path) && GlobalFonts.registerFromPath(path, label)) return label;
  }
  return 'sans-serif';
};

export const drawCard = async (brand: string, tagline: string, lead: string): Promise<Buffer> => {
  const width = WIDTH * SUPERSAMPLE;
  const height = HEIGHT * SUPERSAMPLE;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, PLATE_PALETTE.top);
  gradient.addColorStop(1, PLATE_PALETTE.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // The plate, off to the right and overflowing: a background motif, not an
  // illustration competing with the title.
  const diameter = height * 0.92;
  const left = width - diameter * 0.62;
  const cx = left + diameter / 2;
  const cy = height / 2;
  const disc = (radius: number, fill: string): void => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };

  disc(diameter / 2, PLATE_PALETTE.plate);
  plateWedges().forEach((wedge, index): void => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, diameter * 0.34, wedge.start, wedge.end);
    ctx.closePath();
    ctx.fillStyle = PLATE_PALETTE.wedges[index]!;
    ctx.fill();
  });
  disc(diameter * 0.16, PLATE_PALETTE.plate);

  const titleSize = 84 * SUPERSAMPLE;
  const taglineSize = 40 * SUPERSAMPLE;
  const leadSize = 32 * SUPERSAMPLE;
  const margin = 72 * SUPERSAMPLE;
  const textWidth = left - margin * 1.6;
  const measureWith = (font: string): ((line: string) => number) => (line): number => {
    ctx.font = font;
    return ctx.measureText(line).width;
  };

  let y = margin + 40 * SUPERSAMPLE;
  ctx.fillStyle = TITLE_COLOUR;
  const titleFont = `${titleSize}px "${family('serif')}"`;
  for (const line of wrap(brand, textWidth, measureWith(titleFont))) {
    ctx.font = titleFont;
    ctx.fillText(line, margin, y);
    y += titleSize * 1.15;
  }

  y += 12 * SUPERSAMPLE;
  ctx.font = `${taglineSize}px "${family('sans')}"`;
  ctx.fillStyle = TAGLINE_COLOUR;
  ctx.fillText(tagline, margin, y);
  y += taglineSize * 1.9;

  const leadFont = `${leadSize}px "${family('sans')}"`;
  ctx.fillStyle = LEAD_COLOUR;
  for (const line of wrap(lead, textWidth, measureWith(leadFont))) {
    ctx.font = leadFont;
    ctx.fillText(line, margin, y);
    y += leadSize * 1.35;
  }

  return sharp(canvas.toBuffer('image/png')).resize(WIDTH, HEIGHT, { kernel: 'lanczos3' }).png().toBuffer();
};

const main = async (): Promise<void> => {
  mkdirSync(SEO_PUBLIC, { recursive: true });
  for (const locale of ['fr', 'en'] as const) {
    const messages = JSON.parse(readFileSync(join(TRANSLATION_DIR, `${locale}.json`), 'utf8')) as {
      menu: { brand: string; tagline: string; pageLead: string };
    };
    const { brand, tagline, pageLead } = messages.menu;
    writeFileSync(join(SEO_PUBLIC, `og-${locale}.png`), await drawCard(brand, tagline, pageLead));
    console.log(`og-${locale}.png (${WIDTH}x${HEIGHT})`);
  }
};

if (process.argv[1]?.endsWith('og.ts')) await main();
