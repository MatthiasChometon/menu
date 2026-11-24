export const euros = (cents: number | undefined): string =>
  cents === undefined ? '—' : `${(cents / 100).toFixed(2).replace('.', ',')} €`;
