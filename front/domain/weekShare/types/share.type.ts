export type WeekShareCardHandle = {
  download: () => Promise<void>;
  shareCard: () => Promise<boolean>;
};

export type WeekShareData = {
  wordmark: string;
  weekLabel: string;
  avgKcal: number;
  kcalUnitLabel: string;
  avgMacros: Macros;
  macroLabels: Record<'protein' | 'carbs' | 'fat', string>;
  totalPrice: number;
  budgetLabel: string;
  recipeCount: number;
  recipesLabel: string;
  footer: string;
};
