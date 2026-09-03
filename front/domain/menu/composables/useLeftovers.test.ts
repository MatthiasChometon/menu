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

  it('has no assignment on a slot by default', () => {
    const { assignedOriginOf, assignedTargetOf } = useLeftovers(weekOf());

    expect(assignedOriginOf('thursday', 'dinner')).toBeUndefined();
    expect(assignedTargetOf('monday', 'dinner')).toBeUndefined();
  });

  it('sends a dish leftovers to a chosen future slot', () => {
    const { assignLeftover, assignedOriginOf, assignedTargetOf } = useLeftovers(weekOf());

    assignLeftover('monday', 'dinner', 'thursday', 'dinner');

    expect(assignedOriginOf('thursday', 'dinner')).toEqual({ day: 'monday', slot: 'dinner' });
    expect(assignedTargetOf('monday', 'dinner')).toEqual({ day: 'thursday', slot: 'dinner' });
  });

  it('clears an assignment from either the origin or the target side', () => {
    const { assignLeftover, assignedOriginOf, clearAssignment } = useLeftovers(weekOf());

    assignLeftover('monday', 'dinner', 'thursday', 'dinner');
    clearAssignment('monday', 'dinner');

    expect(assignedOriginOf('thursday', 'dinner')).toBeUndefined();
  });

  it('assigning again replaces both the previous origin and the previous target', () => {
    const { assignLeftover, assignedOriginOf, assignedTargetOf } = useLeftovers(weekOf());

    assignLeftover('monday', 'dinner', 'thursday', 'dinner');
    assignLeftover('monday', 'dinner', 'friday', 'dinner');

    expect(assignedTargetOf('monday', 'dinner')).toEqual({ day: 'friday', slot: 'dinner' });
    expect(assignedOriginOf('thursday', 'dinner')).toBeUndefined();
  });

  it('resets assignments along with origins and decisions', () => {
    const { assignLeftover, assignedOriginOf, reset } = useLeftovers(weekOf());

    assignLeftover('monday', 'dinner', 'thursday', 'dinner');
    reset();

    expect(assignedOriginOf('thursday', 'dinner')).toBeUndefined();
  });
});
