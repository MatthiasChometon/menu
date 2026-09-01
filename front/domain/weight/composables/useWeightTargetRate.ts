// The pace a "prise de masse" week is written for: gaining muscle without
// gaining so fast that most of it turns into fat. A range, not a single
// number, because a body never gains in a straight line — shared by the
// trend's target band and the coach's verdict, so both read the same goal.
export const useWeightTargetRate = (): { minKgPerWeek: number; maxKgPerWeek: number } => ({
  minKgPerWeek: 0.3,
  maxKgPerWeek: 0.4,
});
