import { describe, expect, it } from 'vitest';
import { STYLESHEET_BUDGET_BYTES, stylesheetProblemsOf } from './stylesheet';

describe('stylesheetProblemsOf', () => {
  it('accepts a stylesheet within the ceiling', () => {
    expect(stylesheetProblemsOf(STYLESHEET_BUDGET_BYTES)).toEqual([]);
  });

  it('names a stylesheet over the ceiling', () => {
    expect(stylesheetProblemsOf(STYLESHEET_BUDGET_BYTES + 1)).toHaveLength(1);
  });
});
