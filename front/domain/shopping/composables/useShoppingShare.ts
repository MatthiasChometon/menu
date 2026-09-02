// Turns the list into plain text grouped by aisle, for the one person who is
// not looking at this screen. The Web Share API hands it straight to whatever
// the reader would send it with (messaging apps, mail); where that does not
// exist, a copy to the clipboard plus a toast is the next best thing.
export const useShoppingShare = (): {
  isSharing: Ref<boolean>;
  shareList: (list: { groups: ShoppingGroup[]; seasonings: Seasoning[] }) => Promise<void>;
} => {
  const { nameOf, quantityLabel } = useFoodFormat();
  const { t } = useNuxtApp().$i18n;
  const toast = useToast();
  const isSharing = ref(false);

  const aisleBlock = (group: ShoppingGroup): string =>
    [
      `${t(`shopping.aisle.${group.aisle}`)} :`,
      ...group.lines.map(
        (line): string => `- ${nameOf(line.food)} (${quantityLabel(line.food, line.grams)})`,
      ),
    ].join('\n');

  const seasoningBlock = (seasonings: Seasoning[]): string =>
    [
      `${t('shopping.aisle.seasoning')} :`,
      ...seasonings.map((seasoning): string => `- ${nameOf(seasoning)}`),
    ].join('\n');

  const shareTextFor = (groups: ShoppingGroup[], seasonings: Seasoning[]): string =>
    [
      t('shopping.title'),
      '',
      ...groups.map(aisleBlock),
      ...(seasonings.length > 0 ? [seasoningBlock(seasonings)] : []),
    ].join('\n\n');

  const copyToClipboard = async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: t('shopping.share.copied'),
      icon: 'i-lucide-clipboard-check',
      color: 'success',
    });
  };

  return {
    isSharing,
    shareList: async ({ groups, seasonings }): Promise<void> => {
      if (isSharing.value) return;
      isSharing.value = true;
      const text = shareTextFor(groups, seasonings);

      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: t('shopping.title'), text });
        } catch {
          // Cancelled from the platform sheet, or unsupported mid-call: the
          // reader already saw their own share UI, nothing to recover here.
        } finally {
          isSharing.value = false;
        }
        return;
      }

      await copyToClipboard(text);
      isSharing.value = false;
    },
  };
};
