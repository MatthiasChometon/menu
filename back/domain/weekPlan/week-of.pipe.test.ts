import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { isWeekOf, weekOfPipe } from './week-of.pipe';

describe('the week argument', () => {
  it('lets a real day through untouched', () => {
    expect(weekOfPipe.transform('2026-08-10', { type: 'custom' })).toBe('2026-08-10');
  });

  it.each(['next-monday', '2026-8-10', '2026-13-45', '2026-02-30', '', '2026-08-10T00:00:00Z'])(
    'refuses %j',
    (value) => {
      expect(isWeekOf(value)).toBe(false);
      expect(() => weekOfPipe.transform(value, { type: 'custom' })).toThrow(BadRequestException);
    },
  );
});
