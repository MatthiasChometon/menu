// A plain French seasonal calendar for the fresh produce the app cooks with —
// months a shopper actually finds it at its best, not a botanical almanac.
// Imported staples available year-round (banana, avocado, onion, mushrooms,
// carrot) stay off the list: "in season" only means something for produce
// that genuinely comes and goes.
const seasonByFoodId: Record<string, Month[]> = {
  apple: [1, 2, 3, 9, 10, 11, 12],
  pear: [1, 2, 8, 9, 10, 11, 12],
  orange: [1, 2, 3, 11, 12],
  kiwi: [1, 2, 3, 4, 11, 12],
  broccoli: [1, 2, 3, 9, 10, 11, 12],
  cauliflower: [1, 2, 3, 9, 10, 11, 12],
  leek: [1, 2, 3, 4, 9, 10, 11, 12],
  butternut: [1, 9, 10, 11, 12],
  freshSpinach: [3, 4, 5, 9, 10, 11],
  zucchini: [5, 6, 7, 8, 9],
  bellPepper: [6, 7, 8, 9, 10],
  tomato: [6, 7, 8, 9],
  cucumber: [5, 6, 7, 8, 9],
  eggplant: [6, 7, 8, 9, 10],
  greenBeans: [6, 7, 8, 9],
};

export const useSeason = (): {
  isInSeason: (foodId: string, month: Month) => boolean;
  seasonalFoodIds: (month: Month) => string[];
  currentMonth: () => Month;
} => ({
  isInSeason: (foodId: string, month: Month): boolean =>
    (seasonByFoodId[foodId] ?? []).includes(month),
  seasonalFoodIds: (month: Month): string[] =>
    Object.entries(seasonByFoodId)
      .filter(([, months]): boolean => months.includes(month))
      .map(([foodId]): string => foodId),
  currentMonth: (): Month => new Date().getMonth() + 1,
});
