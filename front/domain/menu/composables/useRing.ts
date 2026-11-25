// The circle both the macro plate and the adherence ring draw on: a 120-wide
// viewBox with the stroke centred on this radius.
export const useRing = (): { radius: number; circumference: number } => {
  const radius = 52;

  return { radius, circumference: 2 * Math.PI * radius };
};
