import { describe, expect, it } from 'vitest';
import { toleranceFor, verdict } from './target';

const tolerance = { default: 5, kcal: 4, fiber: 12 };

describe('verdict', () => {
  it('is ok within the macro tolerance', () => {
    expect(verdict(3200, 3150, 'kcal', tolerance)).toBe('ok');
  });

  it('is low below the tolerance', () => {
    expect(verdict(2900, 3150, 'kcal', tolerance)).toBe('low');
  });

  it('is high above the tolerance', () => {
    expect(verdict(3400, 3150, 'kcal', tolerance)).toBe('high');
  });

  it('falls back to the default tolerance for a macro without its own', () => {
    expect(verdict(172, 165, 'protein', tolerance)).toBe('ok');
    expect(verdict(180, 165, 'protein', tolerance)).toBe('high');
  });

  it('has no verdict when the target is zero', () => {
    expect(verdict(10, 0, 'kcal', tolerance)).toBeUndefined();
  });
});

describe('toleranceFor', () => {
  it('takes the macro override when it has one', () => {
    expect(toleranceFor('fiber', tolerance)).toBe(12);
  });

  it('falls back to the default otherwise', () => {
    expect(toleranceFor('protein', tolerance)).toBe(5);
  });
});
