// 120 € is what a week of this menu comes to; above that, something is off
// with a quantity rather than with the prices.
export const defaultPreference = (): { alertThresholdCents: number } => ({
  alertThresholdCents: 12_000,
});
