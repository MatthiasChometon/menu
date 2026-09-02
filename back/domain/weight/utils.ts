// Wide enough to never reject a real body weight, narrow enough to catch a
// stray keystroke (65 typed as 605) before it reaches the diary. Mirrors the
// bounds the front already enforced against localStorage.
export const weightEntryConstraints = (): { minKg: number; maxKg: number } => ({
  minKg: 30,
  maxKg: 300,
});

export const roundToOneDecimal = (value: number): number => Math.round(value * 10) / 10;

export const todayDate = (): string => new Date().toISOString().slice(0, 10);
