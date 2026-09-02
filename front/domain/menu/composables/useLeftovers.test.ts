import { beforeEach, describe, expect, it } from 'vitest';

const weekOf = (): string => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return latestMenu.weekOf;
};

beforeEach((): void => {
  useLeftovers(weekOf()).reset();
});

describe('useLeftovers', () => {
  it('has no leftover until one is marked', () => {
    const { hasLeftover } = useLeftovers(weekOf());

    expect(hasLeftover('monday', 'dinner')).toBe(false);
  });

  it('marks and clears a leftover', () => {
    const { markLeftover, hasLeftover, clearLeftover } = useLeftovers(weekOf());

    markLeftover('monday', 'dinner');
    expect(hasLeftover('monday', 'dinner')).toBe(true);

    clearLeftover('monday', 'dinner');
    expect(hasLeftover('monday', 'dinner')).toBe(false);
  });

  it('marking twice does not duplicate the entry', () => {
    const { markLeftover, clearLeftover, hasLeftover } = useLeftovers(weekOf());

    markLeftover('monday', 'dinner');
    markLeftover('monday', 'dinner');
    clearLeftover('monday', 'dinner');

    expect(hasLeftover('monday', 'dinner')).toBe(false);
  });

  it('has no decision on a slot by default', () => {
    const { decisionAt } = useLeftovers(weekOf());

    expect(decisionAt('tuesday', 'dinner')).toBeUndefined();
  });

  it('records using a leftover suggestion', () => {
    const { useLeftoverHere, decisionAt } = useLeftovers(weekOf());

    useLeftoverHere('tuesday', 'dinner');

    expect(decisionAt('tuesday', 'dinner')).toBe('used');
  });

  it('records declining a leftover suggestion', () => {
    const { declineLeftover, decisionAt } = useLeftovers(weekOf());

    declineLeftover('tuesday', 'dinner');

    expect(decisionAt('tuesday', 'dinner')).toBe('declined');
  });

  it('clears a decision back to pending', () => {
    const { useLeftoverHere, clearDecision, decisionAt } = useLeftovers(weekOf());

    useLeftoverHere('tuesday', 'dinner');
    clearDecision('tuesday', 'dinner');

    expect(decisionAt('tuesday', 'dinner')).toBeUndefined();
  });
});
