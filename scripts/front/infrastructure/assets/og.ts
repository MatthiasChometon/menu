// Draws the link-preview (Open Graph) cards: the plate motif and gradient of the
// icon, plus the brand/tagline/lead read from the site's own translations, one
// card per language. wrap() is pure and tested; drawCard()/main() do the render.
//
// Usage: pnpm og
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { FRONT, PUBLIC_DIR } from '../../../lib/paths.ts';

const TRANSLATION_DIR = join(FRONT, 'domain', 'menu', 'translation');
const WIDTH = 1200;
const HEIGHT = 630;
const SUPERSAMPLE = 2;

const TOP = '#84cc16';
const BOTTOM = '#3f6212';
const PLATE = '#ffffff';
const SLICES = ['#ecfccb', '#bef264', '#65a30d'];
const TITLE_COLOUR = '#ffffff';
const TAGLINE_COLOUR = '#d9f99d';
const LEAD_COLOUR = '#ecfccb';

const FONT_CANDIDATES: Record<string, string[]> = {
  bold: ['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'],
  semibold: ['C:/Windows/Fonts/seguisb.ttf', 'C:/Windows/Fonts/arialbd.ttf'],
  regular: ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'],
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

/** Break `text` into lines no wider than `limit`, measuring with the given fn. */
export const wrap = (text: string, limit: number, measure: (line: string) => number): string[] => {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = `${current} ${word}`.trim();
    if (current !== '' && measure(candidate) > limit) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
};

export const drawCard = async (brand: string, tagline: string, lead: string): Promise<Buffer> => {
  const width = WIDTH * SUPERSAMPLE;
  const height = HEIGHT * SUPERSAMPLE;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, TOP);
  gradient.addColorStop(1, BOTTOM);
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
  const deg = (value: number): number => (value * Math.PI) / 180;

  disc(diameter / 2, PLATE);
  const foodRadius = diameter * 0.34;
  SLICES.forEach((colour, index) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, foodRadius, deg(-90 + index * 120), deg(-90 + (index + 1) * 120));
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
  });
  disc(diameter * 0.16, PLATE);

  const titleSize = 84 * SUPERSAMPLE;
  const taglineSize = 40 * SUPERSAMPLE;
  const leadSize = 32 * SUPERSAMPLE;
  const boldFamily = family('bold');
  const semiFamily = family('semibold');
  const regularFamily = family('regular');
  const margin = 72 * SUPERSAMPLE;
  const textWidth = left - margin * 1.6;
  const measureWith = (font: string): ((line: string) => number) => {
    return (line) => {
      ctx.font = font;
      return ctx.measureText(line).width;
    };
  };

  let y = margin + 40 * SUPERSAMPLE;
  ctx.fillStyle = TITLE_COLOUR;
  const titleFont = `${titleSize}px "${boldFamily}"`;
  for (const line of wrap(brand, textWidth, measureWith(titleFont))) {
    ctx.font = titleFont;
    ctx.fillText(line, margin, y);
    y += titleSize * 1.15;
  }

  y += 12 * SUPERSAMPLE;
  ctx.font = `${taglineSize}px "${semiFamily}"`;
  ctx.fillStyle = TAGLINE_COLOUR;
  ctx.fillText(tagline, margin, y);
  y += taglineSize * 1.9;

  const leadFont = `${leadSize}px "${regularFamily}"`;
  ctx.fillStyle = LEAD_COLOUR;
  for (const line of wrap(lead, textWidth, measureWith(leadFont))) {
    ctx.font = leadFont;
    ctx.fillText(line, margin, y);
    y += leadSize * 1.35;
  }

  return sharp(canvas.toBuffer('image/png')).resize(WIDTH, HEIGHT, { kernel: 'lanczos3' }).png().toBuffer();
};

const main = async (): Promise<void> => {
  mkdirSync(PUBLIC_DIR, { recursive: true });
  for (const locale of ['fr', 'en'] as const) {
    // The words come from the site's translations, never copied here: a card that
    // contradicts the page it announces is worse than no card.
    const messages = JSON.parse(readFileSync(join(TRANSLATION_DIR, `${locale}.json`), 'utf8')) as {
      menu: { brand: string; tagline: string; pageLead: string };
    };
    const { brand, tagline, pageLead } = messages.menu;
    writeFileSync(join(PUBLIC_DIR, `og-${locale}.png`), await drawCard(brand, tagline, pageLead));
    console.log(`og-${locale}.png (${WIDTH}x${HEIGHT})`);
  }
};

if (process.argv[1]?.endsWith('og.ts')) await main();
