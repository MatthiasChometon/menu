import theme from '#build/ui/button';
import { tv } from '#ui/utils/tv';
import { describe, expect, it } from 'vitest';
import { plainButtonClasses, plainButtonLooks, type PlainButtonSize } from './plainButton';

const classSet = (classes: string): string[] => classes.split(/\s+/).filter(Boolean).sort();

describe('plainButtonClasses', () => {
  const sizes: PlainButtonSize[] = ['xs', 'sm', 'md', 'lg'];

  for (const [color, variant] of plainButtonLooks) {
    for (const size of sizes) {
      for (const square of [false, true]) {
        it(`matches UButton ${color} ${variant} ${size}${square ? ' square' : ''}`, () => {
          const expected = tv(theme)({ color, variant, size, square }).base();

          expect(classSet(plainButtonClasses(variant, size, square, color))).toEqual(
            classSet(expected),
          );
        });
      }
    }
  }

  it('defaults solid and soft to primary and the others to neutral', () => {
    expect(plainButtonClasses('solid', 'md', false)).toBe(
      plainButtonClasses('solid', 'md', false, 'primary'),
    );
    expect(plainButtonClasses('ghost', 'md', false)).toBe(
      plainButtonClasses('ghost', 'md', false, 'neutral'),
    );
  });
});
