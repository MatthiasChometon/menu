import { describe, expect, it } from 'vitest';

describe('placing the cursor on the gauge', () => {
  const { positionOf, zoneOf } = useGaugePosition();

  it('puts the target in the middle', () => {
    expect(positionOf(0)).toBe(50);
  });

  // The whole reason this replaced a progress bar: a bar clamps at full and
  // makes "too much" look like "perfect".
  it('separates too much from not enough', () => {
    expect(positionOf(-15)).toBeLessThan(50);
    expect(positionOf(15)).toBeGreaterThan(50);
  });

  it('stops at the ends rather than running off the track', () => {
    expect(positionOf(-200)).toBe(0);
    expect(positionOf(200)).toBe(100);
  });

  it('reads a small miss as a small move', () => {
    expect(positionOf(3)).toBeGreaterThan(50);
    expect(positionOf(3)).toBeLessThan(56);
  });

  it('draws the target window around the middle', () => {
    const zone = zoneOf(5);

    expect(zone.left).toBeLessThan(50);
    expect(zone.left + zone.width).toBeGreaterThan(50);
  });

  it('widens the window with the tolerance', () => {
    expect(zoneOf(12).width).toBeGreaterThan(zoneOf(4).width);
  });
});
