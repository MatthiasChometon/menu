import { bench, describe } from 'vitest';
import { isWeekOf } from './week-of.pipe';

// Checked on every week argument of every week plan operation.
describe('week-of validation', () => {
  bench('a valid day', () => {
    isWeekOf('2026-11-23');
  });

  bench('a day that does not exist', () => {
    isWeekOf('2026-02-30');
  });
});
