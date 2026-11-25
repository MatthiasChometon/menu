const BASELINE_ITEMS: readonly Omit<EquipmentItem, 'count'>[] = [
  { id: 'knife', icon: 'i-lucide-utensils' },
  { id: 'cuttingBoard', icon: 'i-lucide-square' },
  { id: 'scale', icon: 'i-lucide-scale' },
  { id: 'mixingBowl', icon: 'i-lucide-soup' },
  { id: 'ladle', icon: 'i-lucide-utensils-crossed' },
  { id: 'colander', icon: 'i-lucide-filter' },
  { id: 'ovenTray', icon: 'i-lucide-layers' },
];

export const useEquipmentList = (): {
  itemsOf: (dishCount: number, containerCount: number) => EquipmentItem[];
  labelOf: (id: EquipmentItemId) => string;
} => {
  const { t } = useNuxtApp().$i18n;

  // Literal keys, so the translation checker sees every one of them.
  const labels = computed((): Record<EquipmentItemId, string> => ({
    knife: t('batch.equipment.items.knife'),
    cuttingBoard: t('batch.equipment.items.cuttingBoard'),
    scale: t('batch.equipment.items.scale'),
    mixingBowl: t('batch.equipment.items.mixingBowl'),
    ladle: t('batch.equipment.items.ladle'),
    colander: t('batch.equipment.items.colander'),
    ovenTray: t('batch.equipment.items.ovenTray'),
    cookingVessel: t('batch.equipment.items.cookingVessel'),
    container: t('batch.equipment.items.container'),
  }));

  return {
    labelOf: (id: EquipmentItemId): string => labels.value[id],
    // The baseline never changes: a batch session always starts by chopping and
    // weighing. What is counted is what the week actually asks for — one pot or
    // pan per dish on the stove, one box per portion coming out of it.
    itemsOf: (dishCount: number, containerCount: number): EquipmentItem[] => [
      ...BASELINE_ITEMS,
      { id: 'cookingVessel', icon: 'i-lucide-cooking-pot', count: dishCount },
      { id: 'container', icon: 'i-lucide-package', count: containerCount },
    ],
  };
};
