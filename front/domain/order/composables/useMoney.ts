// Amounts travel in cents; only the display turns them back into euros.
export const useMoney = (): { format: (cents: number | null | undefined) => string } => ({
  format: (cents: number | null | undefined): string =>
    cents === null || cents === undefined
      ? '—'
      : new Intl.NumberFormat(useNuxtApp().$i18n.locale.value, {
          style: 'currency',
          currency: 'EUR',
        }).format(cents / 100),
});
