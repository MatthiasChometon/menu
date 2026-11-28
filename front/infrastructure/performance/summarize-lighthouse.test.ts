import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const { median, summarize } = createRequire(import.meta.url)('./summarize-lighthouse.cjs') as {
  median: (values: number[]) => number;
  summarize: (dirs: string[], calibration?: string) => string[];
};

describe('summarize-lighthouse', () => {
  it('takes the middle value, or the mean of the two middle ones', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('prints one line per URL with the benchmarkIndex, the TBT of every run and the calibration', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lh-'));
    [
      { tbt: 300, bench: 2400 },
      { tbt: 200, bench: 4000 },
      { tbt: 250, bench: 3000 },
    ].forEach(({ tbt, bench }, index) => {
      writeFileSync(
        join(dir, `lhr-${index}.report.json`),
        JSON.stringify({
          finalUrl: 'http://localhost/en',
          audits: {
            'total-blocking-time': { numericValue: tbt },
            'largest-contentful-paint': { numericValue: tbt * 10 },
          },
          environment: { benchmarkIndex: bench },
        }),
      );
    });

    expect(
      summarize(
        [dir, join(dir, 'missing')],
        'warm-up benchmarkIndex 2800 | factor 4 | free RAM MB 5000',
      ),
    ).toEqual([
      'LH-SUMMARY http://localhost/en runs 3 | benchmarkIndex median 3000 min 2400 max 4000 [2400, 4000, 3000] | LCP ms median 2500 min 2000 max 3000 [3000, 2000, 2500] | TBT ms median 250 min 200 max 300 [300, 200, 250] | warm-up benchmarkIndex 2800 | factor 4 | free RAM MB 5000',
    ]);
  });
});
