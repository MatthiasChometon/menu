import { beforeEach, describe, expect, it } from 'vitest';

const { storedValue, isArrayOf, isRecordOf } = useStoredValue();

const isNumber = (value: unknown): value is number => typeof value === 'number';

beforeEach(() => {
  localStorage.clear();
});

describe('storedValue', () => {
  it('reads back a value that passes its guard', () => {
    localStorage.setItem('numbers', JSON.stringify([1, 2, 3]));

    expect(storedValue<number[]>('numbers', [], isArrayOf(isNumber)).value).toEqual([1, 2, 3]);
  });

  it('falls back when the stored text is not JSON', () => {
    localStorage.setItem('numbers', '{oops');

    expect(storedValue<number[]>('numbers', [], isArrayOf(isNumber)).value).toEqual([]);
  });

  it('falls back when the stored value has the wrong shape', () => {
    localStorage.setItem('numbers', JSON.stringify({ not: 'an array' }));

    expect(storedValue<number[]>('numbers', [], isArrayOf(isNumber)).value).toEqual([]);
  });

  it('falls back when one entry fails the guard', () => {
    localStorage.setItem('scores', JSON.stringify({ a: 1, b: 'two' }));

    expect(storedValue<Record<string, number>>('scores', {}, isRecordOf(isNumber)).value).toEqual(
      {},
    );
  });

  it('refuses an array where a record is expected', () => {
    expect(isRecordOf(isNumber)([1, 2])).toBe(false);
  });
});
