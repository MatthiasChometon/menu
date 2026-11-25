// Words, not percentages. "Protéines un peu justes" tells somebody what to look
// for in the next dish; "-12 %" asks them to work out what that means for
// dinner, which is not their job.
export const useBalanceWording = (): { wordingOf: (gap: MacroGap) => string } => {
  const { macroLongLabel } = useMenuLabels();
  const { balanceSideLabel } = usePlannerLabels();

  return {
    wordingOf: (gap: MacroGap): string =>
      `${macroLongLabel(gap.macro)} ${balanceSideLabel(gap.gapPercent)}`,
  };
};
