import { beforeEach, describe, expect, it } from 'vitest';

const WEEK = '2026-09-07';
const OTHER_WEEK = '2026-09-14';

beforeEach((): void => {
  useShoppingSpend((): string => WEEK).setActual(undefined);
  useShoppingSpend((): string => OTHER_WEEK).setActual(undefined);
});

describe('useShoppingSpend', () => {
  it('has no amount until one is entered', () => {
    const { actualEuros } = useShoppingSpend((): string => WEEK);

    expect(actualEuros.value).toBeUndefined();
  });

  it('remembers what was entered for the week', () => {
    const { actualEuros, setActual } = useShoppingSpend((): string => WEEK);

    setActual(87.5);

    expect(actualEuros.value).toBe(87.5);
  });

  it('clears the amount for a blank or non-positive entry', () => {
    const { actualEuros, setActual } = useShoppingSpend((): string => WEEK);

    setActual(50);
    setActual(0);
    expect(actualEuros.value).toBeUndefined();

    setActual(50);
    setActual(undefined);
    expect(actualEuros.value).toBeUndefined();
  });

  it('keeps one week apart from another', () => {
    useShoppingSpend((): string => WEEK).setActual(40);
    useShoppingSpend((): string => OTHER_WEEK).setActual(60);

    expect(useShoppingSpend((): string => WEEK).actualEuros.value).toBe(40);
    expect(useShoppingSpend((): string => OTHER_WEEK).actualEuros.value).toBe(60);
  });
});
