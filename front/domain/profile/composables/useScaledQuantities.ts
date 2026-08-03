import type { Targets } from './useProfile';

type Macros = { kcal: number; protein: number };

// A recipe's grammes are written against the menu's own targets. Someone else
// eats the same dish, scaled — but not by a single ratio: dividing everything by
// the calorie ratio would drag protein down with it, which is exactly backwards
// for anyone eating less in order to lose fat.
export const useScaledQuantities = (): {
  isProteinFood: (macrosPer100g: Macros) => boolean;
  scaleFor: (macrosPer100g: Macros, menu: Targets, mine: Targets) => number;
  scaleQuantity: (grams: number, macrosPer100g: Macros, menu: Targets, mine: Targets) => number;
} => {
  // A food counts as a protein source when protein carries at least this much
  // of its energy: meat, fish, eggs, skyr and whey clear it, bread and oats
  // do not.
  const proteinShareThreshold = 0.4;

  const isProteinFood = ({ kcal, protein }: Macros): boolean =>
    kcal > 0 && (protein * 4) / kcal >= proteinShareThreshold;

  const scaleFor = (macrosPer100g: Macros, menu: Targets, mine: Targets): number => {
    if (menu.kcal === 0 || menu.protein === 0) return 1;

    return isProteinFood(macrosPer100g) ? mine.protein / menu.protein : mine.kcal / menu.kcal;
  };

  const scaleQuantity = (
    grams: number,
    macrosPer100g: Macros,
    menu: Targets,
    mine: Targets,
  ): number => {
    const scaled = grams * scaleFor(macrosPer100g, menu, mine);

    // Below 5 g the rounding matters more than the precision; above it, whole
    // grammes are what a kitchen scale shows anyway.
    return scaled < 5 ? Math.round(scaled * 10) / 10 : Math.round(scaled);
  };

  return { isProteinFood, scaleFor, scaleQuantity };
};
