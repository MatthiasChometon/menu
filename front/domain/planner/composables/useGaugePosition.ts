// The track runs from thirty percent under the target to thirty percent over,
// with the target itself in the middle. Beyond that the cursor stops at the
// end: the exact size of a very large miss changes nothing to what has to be
// done about it.
const RANGE = 30;

// Kept apart from the component so the arithmetic can be checked without a
// browser — a cursor placed wrong would tell somebody they are over when they
// are under, which is worse than showing nothing.
export const useGaugePosition = (): {
  positionOf: (gapPercent: number) => number;
  zoneOf: (tolerance: number) => { left: number; width: number };
} => {
  const positionOf = (gapPercent: number): number =>
    50 + (Math.max(-RANGE, Math.min(RANGE, gapPercent)) / RANGE) * 50;

  return {
    positionOf,
    zoneOf: (tolerance: number): { left: number; width: number } => {
      const left = positionOf(-tolerance);

      return { left, width: positionOf(tolerance) - left };
    },
  };
};
