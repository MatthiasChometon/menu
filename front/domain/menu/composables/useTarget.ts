import type { Macros, MacroTolerance, Verdict } from '../types/menu.type';

type Target = {
  toleranceFor: (macro: keyof Macros, tolerance: MacroTolerance) => number;
  verdict: (
    actual: number,
    target: number,
    macro: keyof Macros,
    tolerance: MacroTolerance,
  ) => Verdict | undefined;
};

// Pure, no Nuxt dependency: the check script reads the same verdicts as the app.
export const useTarget = (): Target => {
  const toleranceFor = (macro: keyof Macros, tolerance: MacroTolerance): number =>
    tolerance[macro] ?? tolerance.default;

  const verdict = (
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

  return { toleranceFor, verdict };
};
