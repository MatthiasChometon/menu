import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DEVICE_LABEL_MAX_LENGTH, deviceLabelPipe } from './label.pipe';

const transform = (value: unknown): string => deviceLabelPipe.transform(value, { type: 'custom' });

describe('the browser name pipe', () => {
  it('trims a name', () => {
    expect(transform('  Firefox du salon ')).toBe('Firefox du salon');
  });

  it('accepts the longest name', () => {
    expect(transform('a'.repeat(DEVICE_LABEL_MAX_LENGTH))).toHaveLength(DEVICE_LABEL_MAX_LENGTH);
  });

  it.each([['a'.repeat(DEVICE_LABEL_MAX_LENGTH + 1)], ['   '], [''], [42], [undefined], [['a']]])(
    'refuses %j',
    (value) => {
      expect(() => transform(value)).toThrow(BadRequestException);
    },
  );
});
