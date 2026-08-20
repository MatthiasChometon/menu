import type { MacroGap } from './usePlanner';

// Words, not percentages. "Protéines un peu justes" tells somebody what to look
// for in the next dish; "-12 %" asks them to work out what that means for
// dinner, which is not their job.
export const useBalanceWording = (): { wordingOf: (gap: MacroGap) => string } => {
  const { t } = useNuxtApp().$i18n;

  return {
    wordingOf: (gap: MacroGap): string =>
      `${t(`menu.macroLong.${gap.macro}`)} ${t(`planner.balance.${gap.gapPercent < 0 ? 'short' : 'over'}`)}`,
  };
};
