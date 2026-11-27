import { describe, expect, it } from 'vitest';
import { formatDayMonth } from './dayMonthFormat';

describe('formatDayMonth', () => {
  it('writes the day and the month in the locale', () => {
    const date = new Date(2026, 10, 27);

    expect(formatDayMonth(date, 'fr')).toBe(
      date.toLocaleDateString('fr', { day: 'numeric', month: 'long' }),
    );
  });

  it('follows the locale it is given each time', () => {
    const date = new Date(2026, 10, 27);

    expect(formatDayMonth(date, 'fr')).not.toBe(formatDayMonth(date, 'en'));
  });
});
