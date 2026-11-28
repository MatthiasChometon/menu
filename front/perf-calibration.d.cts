export const REFERENCE_BENCHMARK_INDEX: number;
export const median: (values: number[]) => number;
export const slowdownFor: (benchmarkIndex: number) => number;
export const isSteady: (indexes: number[], tolerance?: number) => boolean;
export const benchmarkIndexesOf: (dir: string) => number[];
export const readCalibration: (
  file?: string,
  env?: Record<string, string | undefined>,
) => {
  benchmarkIndex: number | undefined;
  slowdown: number;
};
