import type { Macros, MacroTolerance } from '../types/menu.type';

export type Verdict = 'ok' | 'low' | 'high';

export const toleranceFor = (macro: keyof Macros, tolerance: MacroTolerance): number =>
  tolerance[macro] ?? tolerance.default;

export const verdict = (
  actual: number,
  target: number,
  macro: keyof Macros,
  tolerance: MacroTolerance,
): Verdict | undefined => {
  if (target <= 0) return undefined;

  const gap = ((actual - target) / target) * 100;
  if (Math.abs(gap) <= toleranceFor(macro, tolerance)) return 'ok';
  return gap < 0 ? 'low' : 'high';
};
