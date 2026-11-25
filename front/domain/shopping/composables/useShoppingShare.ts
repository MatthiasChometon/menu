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
  const { aisleLabel } = useShoppingAisles();
  const { reportError } = useErrorReporting();
  const toast = useToast();
  const isSharing = ref(false);

  const aisleBlock = (group: ShoppingGroup): string =>
    [
      `${aisleLabel(group.aisle)} :`,
      ...group.lines.map(
        (line): string => `- ${nameOf(line.food)} (${quantityLabel(line.food, line.grams)})`,
      ),
    ].join('\n');

  const seasoningBlock = (seasonings: Seasoning[]): string =>
    [
      `${aisleLabel('seasoning')} :`,
      ...seasonings.map((seasoning): string => `- ${nameOf(seasoning)}`),
    ].join('\n');

  const shareTextFor = (groups: ShoppingGroup[], seasonings: Seasoning[]): string =>
    [
      t('shopping.title'),
      '',
      ...groups.map(aisleBlock),
      ...(seasonings.length > 0 ? [seasoningBlock(seasonings)] : []),
    ].join('\n\n');

  const announce = (title: string, icon: string, color: 'success' | 'error'): void => {
    toast.add({ title, icon, color });
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    announce(t('shopping.share.copied'), 'i-lucide-clipboard-check', 'success');
  };

  // The reader closing the platform sheet is an answer, not a failure.
  const isCancellation = (error: unknown): boolean =>
    error instanceof DOMException && error.name === 'AbortError';

  const send = async (text: string): Promise<void> => {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: t('shopping.title'), text });
    } else {
      await copyToClipboard(text);
    }
  };

  return {
    isSharing,
    shareList: async ({ groups, seasonings }): Promise<void> => {
      if (isSharing.value) return;
      isSharing.value = true;

      try {
        await send(shareTextFor(groups, seasonings));
      } catch (error) {
        if (isCancellation(error)) return;
        reportError('shopping:share', error);
        announce(t('shopping.share.failed'), 'i-lucide-circle-alert', 'error');
      } finally {
        isSharing.value = false;
      }
    },
  };
};
