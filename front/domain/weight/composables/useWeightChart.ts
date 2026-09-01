export type ChartPoint = { x: number; y: number };
export type ChartDomain = { minDate: string; maxDate: string };
export type ChartRange = { min: number; max: number };

const WIDTH = 320;
const HEIGHT = 160;

// Pure SVG geometry — no Vue, no i18n — so the drawing math can be checked
// without a browser, the same reasoning as the planner's gauge. The chart
// component only ever turns dates and kilograms into points here, then reads
// them back as coordinates.
export const useWeightChart = (): {
  viewBox: { width: number; height: number };
  scaleXOf: (date: string, domain: ChartDomain) => number;
  rangeOf: (values: number[]) => ChartRange;
  scaleYOf: (kg: number, range: ChartRange) => number;
  pathOf: (points: ChartPoint[]) => string;
  lengthOf: (points: ChartPoint[]) => number;
  bandPolygonOf: (top: ChartPoint[], bottom: ChartPoint[]) => string;
} => {
  const { daysBetween } = useWeightDates();

  const scaleXOf = (date: string, domain: ChartDomain): number => {
    const span = daysBetween(domain.minDate, domain.maxDate);
    if (span <= 0) return WIDTH / 2;

    return (daysBetween(domain.minDate, date) / span) * WIDTH;
  };

  // A little headroom above and below the data, so a point never sits right
  // on the frame and a flat week is not stretched into a dramatic climb.
  const rangeOf = (values: number[]): ChartRange => {
    if (values.length === 0) return { min: 0, max: 1 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(1, (max - min) * 0.2);

    return { min: min - padding, max: max + padding };
  };

  const scaleYOf = (kg: number, range: ChartRange): number => {
    const span = range.max - range.min;
    if (span <= 0) return HEIGHT / 2;

    return HEIGHT - ((kg - range.min) / span) * HEIGHT;
  };

  const pathOf = (points: ChartPoint[]): string =>
    points
      .map(
        (point, index): string =>
          `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(' ');

  // Sum of the straight segments — exact for a polyline, and what
  // `stroke-dasharray`/`stroke-dashoffset` need to draw the line in on
  // mount without an animation library.
  const lengthOf = (points: ChartPoint[]): number =>
    points.slice(1).reduce((total, point, index): number => {
      const previous = points[index]!;
      return total + Math.hypot(point.x - previous.x, point.y - previous.y);
    }, 0);

  const bandPolygonOf = (top: ChartPoint[], bottom: ChartPoint[]): string => {
    if (top.length < 2 || bottom.length < 2) return '';

    const asPairs = (points: ChartPoint[]): string[] =>
      points.map((point): string => `${point.x.toFixed(1)},${point.y.toFixed(1)}`);

    return [...asPairs(top), ...asPairs([...bottom].reverse())].join(' ');
  };

  return {
    viewBox: { width: WIDTH, height: HEIGHT },
    scaleXOf,
    rangeOf,
    scaleYOf,
    pathOf,
    lengthOf,
    bandPolygonOf,
  };
};
