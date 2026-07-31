export const useFoodFormat = (): {
  nameOf: (item: { name: LocalizedText }) => string;
  stepsOf: (recipe: Recipe) => string[];
  quantityLabel: (food: Food, grams: number) => string;
  pieceCount: (food: Food, grams: number) => number | undefined;
  round: (value: number) => number;
} => {
  const { locale } = useNuxtApp().$i18n;

  const isEnglish = (): boolean => locale.value === 'en';

  const quantityLabel = (food: Food, grams: number): string => {
    const rounded = Math.round(grams);
    if (rounded < 1000) return `${rounded} ${food.unit}`;

    const large = (rounded / 1000).toFixed(2).replace(/\.?0+$/, '');
    const unit = food.unit === 'ml' ? 'L' : 'kg';
    return `${isEnglish() ? large : large.replace('.', ',')} ${unit}`;
  };

  return {
    nameOf: (item: { name: LocalizedText }): string => (isEnglish() ? item.name.en : item.name.fr),
    stepsOf: (recipe: Recipe): string[] => (isEnglish() ? recipe.steps.en : recipe.steps.fr),
    quantityLabel,
    pieceCount: (food: Food, grams: number): number | undefined =>
      food.pieceWeight === undefined
        ? undefined
        : Math.max(1, Math.round(grams / food.pieceWeight)),
    round: (value: number): number => Math.round(value),
  };
};
