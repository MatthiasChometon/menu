import { describe, expect, it } from 'vitest';
import { FAVICON_SVG, PLATE_PALETTE, plateWedges } from './icon';

describe('plateWedges', () => {
  it('splits the plate into one wedge per macro', () => {
    expect(plateWedges()).toHaveLength(PLATE_PALETTE.wedges.length);
  });

  it('covers the whole circle with equal wedges', () => {
    const spans = plateWedges().map((wedge): number => wedge.end - wedge.start);

    for (const span of spans) expect(span).toBeCloseTo((2 * Math.PI) / 3);
    expect(spans.reduce((total, span): number => total + span, 0)).toBeCloseTo(2 * Math.PI);
  });
});

describe('FAVICON_SVG', () => {
  it('is a self-contained svg carrying the forest gradient', () => {
    expect(FAVICON_SVG).toContain('<svg');
    expect(FAVICON_SVG).toContain(PLATE_PALETTE.top);
  });
});
