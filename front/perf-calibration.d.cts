export const REFERENCE_BENCHMARK_INDEX: number;
export const median: (values: number[]) => number;
export const slowdownFor: (benchmarkIndex: number) => number;
export const benchmarkIndexOf: (dir: string) => number;
export const readCalibration: (file?: string) => {
  benchmarkIndex: number | undefined;
  slowdown: number;
};
