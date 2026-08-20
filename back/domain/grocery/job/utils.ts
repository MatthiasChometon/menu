export const jobConstraints = (): {
  foodIdMaxLength: number;
  labelMaxLength: number;
  detailMaxLength: number;
} => ({
  foodIdMaxLength: 60,
  labelMaxLength: 200,
  detailMaxLength: 500,
});
