export const jobConstraints = (): {
  foodIdMaxLength: number;
  labelMaxLength: number;
  detailMaxLength: number;
  maxNeedsPerJob: number;
} => ({
  foodIdMaxLength: 60,
  labelMaxLength: 200,
  detailMaxLength: 500,
  maxNeedsPerJob: 200,
});
