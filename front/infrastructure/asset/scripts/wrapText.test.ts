import { describe, expect, it } from 'vitest';
import { wrap } from './og';

// A stand-in for the canvas metric: one unit per character.
const byChar = (line: string): number => line.length;

describe('wrap', () => {
  it('keeps a line that fits on one line', () => {
    expect(wrap('a short lead', 100, byChar)).toEqual(['a short lead']);
  });

  it('breaks onto a new line once the limit is passed', () => {
    expect(wrap('one two three', 7, byChar)).toEqual(['one two', 'three']);
  });

  it('never drops a word longer than the limit', () => {
    expect(wrap('supercalifragilistic', 5, byChar)).toEqual(['supercalifragilistic']);
  });
});
