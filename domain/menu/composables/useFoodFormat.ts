export const useFoodFormat = (): {
  nameOf: (item: { name: LocalizedText }) => string;
  stepsOf: (recipe: Recipe) => string[];
  quantityLabel: (food: Food, grams: number) => string;
  pieceLabel: (food: Food, grams: number) => string | undefined;
  round: (value: number) => number;
} => {
  const { locale } = useNuxtApp().$i18n;

  const isEnglish = (): boolean => locale.value === 'en';

  const localized = (text: LocalizedText): string => (isEnglish() ? text.en : text.fr);

  const quantityLabel = (food: Food, grams: number): string => {
    const rounded = Math.round(grams);
    if (rounded < 1000) return `${rounded} ${food.unit}`;

    const large = (rounded / 1000).toFixed(2).replace(/\.?0+$/, '');
    const unit = food.unit === 'ml' ? 'L' : 'kg';
    return `${isEnglish() ? large : large.replace('.', ',')} ${unit}`;
  };

  return {
    nameOf: (item: { name: LocalizedText }): string => localized(item.name),
    stepsOf: (recipe: Recipe): string[] => (isEnglish() ? recipe.steps.en : recipe.steps.fr),
    quantityLabel,
    pieceLabel: (food: Food, grams: number): string | undefined => {
      if (food.pieceWeight === undefined || food.piece === undefined) return undefined;

      const count = Math.max(1, Math.round(grams / food.pieceWeight));
      const noun = count === 1 ? (food.pieceOne ?? food.piece) : food.piece;

      return `${count} ${localized(noun)}`;
    },
    round: (value: number): number => Math.round(value),
  };
};
