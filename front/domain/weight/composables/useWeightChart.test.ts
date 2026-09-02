import { describe, expect, it } from 'vitest';

describe('useWeightChart', () => {
  it('places the first date of the domain at the left edge', () => {
    const { scaleXOf } = useWeightChart();

    expect(scaleXOf('2026-08-01', { minDate: '2026-08-01', maxDate: '2026-08-08' })).toBe(0);
  });

  it('places the last date of the domain at the right edge', () => {
    const { scaleXOf, viewBox } = useWeightChart();

    const domain = { minDate: '2026-08-01', maxDate: '2026-08-08' };

    expect(scaleXOf('2026-08-08', domain)).toBe(viewBox.width);
  });

  it('places a date halfway through the span at the middle', () => {
    const { scaleXOf, viewBox } = useWeightChart();

    const domain = { minDate: '2026-08-01', maxDate: '2026-08-09' };

    expect(scaleXOf('2026-08-05', domain)).toBeCloseTo(viewBox.width / 2);
  });

  it('does not divide by zero when every weigh-in shares one date', () => {
    const { scaleXOf, viewBox } = useWeightChart();

    const domain = { minDate: '2026-08-01', maxDate: '2026-08-01' };

    expect(scaleXOf('2026-08-01', domain)).toBe(viewBox.width / 2);
  });

  it('puts the lightest weight near the bottom and the heaviest near the top', () => {
    const { scaleYOf, rangeOf, viewBox } = useWeightChart();

    const range = rangeOf([79, 82]);

    expect(scaleYOf(79, range)).toBeGreaterThan(scaleYOf(82, range));
    expect(scaleYOf(79, range)).toBeLessThanOrEqual(viewBox.height);
    expect(scaleYOf(82, range)).toBeGreaterThanOrEqual(0);
  });

  it('pads the range so a flat week is not drawn as a cliff', () => {
    const { rangeOf } = useWeightChart();

    const range = rangeOf([80, 80]);

    expect(range.max).toBeGreaterThan(range.min);
  });

  it('draws a path that starts at the first point', () => {
    const { pathOf } = useWeightChart();

    expect(
      pathOf([
        { x: 0, y: 10 },
        { x: 5, y: 20 },
      ]),
    ).toBe('M 0.0 10.0 L 5.0 20.0');
  });

  it('measures a straight line as its literal length', () => {
    const { lengthOf } = useWeightChart();

    expect(
      lengthOf([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ]),
    ).toBe(5);
  });

  it('has nothing to draw with fewer than two points on either edge', () => {
    const { bandPolygonOf } = useWeightChart();

    expect(bandPolygonOf([{ x: 0, y: 0 }], [{ x: 0, y: 10 }])).toBe('');
  });

  it('closes the band by walking the bottom edge backwards', () => {
    const { bandPolygonOf } = useWeightChart();

    const top = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const bottom = [
      { x: 0, y: 10 },
      { x: 10, y: 10 },
    ];

    expect(bandPolygonOf(top, bottom)).toBe('0.0,0.0 10.0,0.0 10.0,10.0 0.0,10.0');
  });
});
