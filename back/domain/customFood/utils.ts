// Wide enough to never reject a real food, narrow enough to catch a stray
// keystroke before it skews every recipe that uses it.
export const customFoodConstraints = (): {
  maxNameLength: number;
  maxItems: number;
  maxKcal: number;
  maxMacro: number;
  maxPricePerKg: number;
} => ({
  maxNameLength: 60,
  // A ceiling rather than a rule about cupboards: it stops a runaway script
  // from filling the table, and no one's own pantry needs more than this.
  maxItems: 200,
  maxKcal: 950,
  maxMacro: 100,
  maxPricePerKg: 500,
});
