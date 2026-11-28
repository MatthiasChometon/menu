import theme from '#build/ui/badge';
import { tv } from '#ui/utils/tv';
import { describe, expect, it } from 'vitest';
import { plainBadgeClasses, plainBadgeColors } from './plainBadge';

const classSet = (classes: string): string[] => classes.split(/\s+/).filter(Boolean).sort();

describe('plainBadgeClasses', () => {
  for (const color of plainBadgeColors) {
    it(`matches UBadge ${color} subtle sm`, () => {
      const expected = tv(theme)({ color, variant: 'subtle', size: 'sm' }).base();

      expect(classSet(plainBadgeClasses(color))).toEqual(classSet(expected));
    });
  }
});
