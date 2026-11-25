// Every aisle name is a literal key, so the translation checker can see which
// ones are used. Seasonings are not an Aisle of the catalog but get a heading
// of their own in the list.
export const useShoppingAisles = (): {
  aisleLabel: (aisle: Aisle | 'seasoning') => string;
} => {
  const { t } = useNuxtApp().$i18n;

  const labels = computed((): Record<Aisle | 'seasoning', string> => ({
    butcher: t('shopping.aisle.butcher'),
    dairy: t('shopping.aisle.dairy'),
    produce: t('shopping.aisle.produce'),
    frozen: t('shopping.aisle.frozen'),
    grocery: t('shopping.aisle.grocery'),
    supplement: t('shopping.aisle.supplement'),
    seasoning: t('shopping.aisle.seasoning'),
  }));

  return { aisleLabel: (aisle): string => labels.value[aisle] };
};
