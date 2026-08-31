import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { drawCard, wrap } from './og.ts';

// A stand-in measurer: one unit per character, so the tests read at a glance.
const byChar = (line: string): number => line.length;

describe('wrap', () => {
  it('keeps words on one line while they fit', () => {
    expect(wrap('a b c', 10, byChar)).toEqual(['a b c']);
  });

  it('breaks before the word that would overflow', () => {
    expect(wrap('aaaa bbbb cccc', 9, byChar)).toEqual(['aaaa bbbb', 'cccc']);
  });

  it('never drops a word longer than the limit', () => {
    expect(wrap('supercalifragilistic ok', 5, byChar)).toEqual(['supercalifragilistic', 'ok']);
  });
});

describe('drawCard', () => {
  it('produces a 1200x630 PNG card', async () => {
    const meta = await sharp(await drawCard('Le Menu', 'Repas et courses', 'Un lead un peu plus long.')).metadata();

    expect(meta.format).toBe('png');
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
  });
});
