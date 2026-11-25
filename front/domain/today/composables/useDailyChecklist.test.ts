import { beforeEach, describe, expect, it, vi } from 'vitest';

const checklistOn = (dateIso: string): ReturnType<typeof useDailyChecklist> =>
  useDailyChecklist(new Date(dateIso));

// The stores live in localStorage, shared across every test in this file.
beforeEach((): void => {
  checklistOn('2026-08-10T09:00:00').reset();
});

describe('useDailyChecklist reminders', () => {
  it('starts the day with nothing checked', () => {
    const { reminderItems } = checklistOn('2026-08-10T09:00:00');

    expect(reminderItems.value.every((item): boolean => !item.isChecked)).toBe(true);
  });

  it('checks a reminder for today only', () => {
    const { toggleReminder, reminderItems } = checklistOn('2026-08-10T09:00:00');

    toggleReminder('creatine');

    const creatine = reminderItems.value.find((item): boolean => item.id === 'creatine');
    expect(creatine?.isChecked).toBe(true);
  });

  it('unchecks a reminder tapped a second time', () => {
    const { toggleReminder, reminderItems } = checklistOn('2026-08-10T09:00:00');

    toggleReminder('water');
    toggleReminder('water');

    const water = reminderItems.value.find((item): boolean => item.id === 'water');
    expect(water?.isChecked).toBe(false);
  });

  // Regression guards (startOf was already Paris-based): they pin the midnight edge.
  it('counts half past midnight in Paris as the new day, even when the device is on UTC', () => {
    // 22:30 UTC on the 10th is already 00:30 on the 11th in Paris.
    checklistOn('2026-08-10T22:30:00Z').toggleReminder('creatine');

    const { reminderItems } = checklistOn('2026-08-11T09:00:00+02:00');

    expect(reminderItems.value.find((item): boolean => item.id === 'creatine')?.isChecked).toBe(
      true,
    );
  });

  it('keeps 23:30 in Paris on the day that is ending', () => {
    checklistOn('2026-08-10T21:30:00Z').toggleReminder('creatine');

    const { reminderItems } = checklistOn('2026-08-10T08:00:00+02:00');

    expect(reminderItems.value.find((item): boolean => item.id === 'creatine')?.isChecked).toBe(
      true,
    );
  });

  it('resets to nothing checked on a new day', () => {
    checklistOn('2026-08-10T09:00:00').toggleReminder('creatine');

    const { reminderItems } = checklistOn('2026-08-11T09:00:00');

    expect(reminderItems.value.every((item): boolean => !item.isChecked)).toBe(true);
  });

  it('has no streak until a full day is checked off', () => {
    const { toggleReminder, reminderStreak } = checklistOn('2026-08-10T09:00:00');

    toggleReminder('creatine');
    toggleReminder('water');

    expect(reminderStreak.value).toBe(0);
  });

  it('counts a streak across consecutive completed days', () => {
    for (const day of ['2026-08-08', '2026-08-09']) {
      const { toggleReminder } = checklistOn(`${day}T09:00:00`);
      toggleReminder('creatine');
      toggleReminder('water');
      toggleReminder('vitaminD');
    }

    const { reminderStreak } = checklistOn('2026-08-10T09:00:00');

    // Yesterday and the day before are both complete; today has not started.
    expect(reminderStreak.value).toBe(2);
  });

  it('stops the streak at a day left incomplete', () => {
    const complete = checklistOn('2026-08-08T09:00:00');
    complete.toggleReminder('creatine');
    complete.toggleReminder('water');
    complete.toggleReminder('vitaminD');

    // The 9th is skipped entirely: no reminder checked at all.
    const { reminderStreak } = checklistOn('2026-08-10T09:00:00');

    expect(reminderStreak.value).toBe(0);
  });

  it('keeps yesterday streak even before today is finished', () => {
    const yesterday = checklistOn('2026-08-09T09:00:00');
    yesterday.toggleReminder('creatine');
    yesterday.toggleReminder('water');
    yesterday.toggleReminder('vitaminD');

    const today = checklistOn('2026-08-10T07:00:00');
    today.toggleReminder('creatine');

    expect(today.reminderStreak.value).toBe(1);
  });
});

describe('useDailyChecklist hydration', () => {
  it('starts the day with nothing drunk', () => {
    const { hydrationGlasses, hydrationLiters } = checklistOn('2026-08-10T09:00:00');

    expect(hydrationGlasses.value).toBe(0);
    expect(hydrationLiters.value).toBe(0);
  });

  it('fills up to the glass that is tapped', () => {
    const { toggleHydrationGlass, hydrationGlasses } = checklistOn('2026-08-10T09:00:00');

    toggleHydrationGlass(2);

    expect(hydrationGlasses.value).toBe(3);
  });

  it('empties the last full glass when tapped again', () => {
    const { toggleHydrationGlass, hydrationGlasses } = checklistOn('2026-08-10T09:00:00');

    toggleHydrationGlass(2);
    toggleHydrationGlass(2);

    expect(hydrationGlasses.value).toBe(2);
  });

  it('reaches the target at the seventh glass, worth 3.5 L', () => {
    const { toggleHydrationGlass, hasReachedHydrationTarget, hydrationLiters } =
      checklistOn('2026-08-10T09:00:00');

    toggleHydrationGlass(6);

    expect(hasReachedHydrationTarget.value).toBe(true);
    expect(hydrationLiters.value).toBeCloseTo(3.5);
  });

  it('keeps yesterday and today apart', () => {
    checklistOn('2026-08-09T09:00:00').toggleHydrationGlass(3);

    const { hydrationGlasses } = checklistOn('2026-08-10T09:00:00');

    expect(hydrationGlasses.value).toBe(0);
  });
});

describe('useDailyChecklist streak across the end of summer time', () => {
  it('counts the 25 October night, which lasts 25 hours, as one day', () => {
    for (const day of ['2026-10-24', '2026-10-25']) {
      const { toggleReminder } = checklistOn(`${day}T12:00:00+01:00`);
      toggleReminder('creatine');
      toggleReminder('water');
      toggleReminder('vitaminD');
    }

    const { reminderStreak } = checklistOn('2026-10-26T08:00:00+01:00');

    expect(reminderStreak.value).toBe(2);
  });
});

describe('what an earlier visit left in the browser', () => {
  const freshChecklist = async (
    key: string,
    stored: unknown,
  ): Promise<ReturnType<typeof useDailyChecklist>> => {
    localStorage.setItem(key, JSON.stringify(stored));
    vi.resetModules();
    const { useDailyChecklist: useFresh } = await import('./useDailyChecklist');

    return useFresh(new Date('2026-08-10T09:00:00+02:00'));
  };

  it('keeps well formed reminders and glasses', async () => {
    const reminders = await freshChecklist('today:reminders', { '2026-08-10': ['water'] });
    expect(
      reminders.reminderItems.value.find((item): boolean => item.id === 'water')?.isChecked,
    ).toBe(true);

    const hydration = await freshChecklist('today:hydration', { '2026-08-10': 4 });
    expect(hydration.hydrationGlasses.value).toBe(4);
  });

  it('starts the day over when a reminder is not one we know', async () => {
    const { reminderItems } = await freshChecklist('today:reminders', {
      '2026-08-10': ['water', 'magnesium'],
    });

    expect(reminderItems.value.every((item): boolean => !item.isChecked)).toBe(true);
  });

  it.each([
    [{ '2026-08-10': 'lots' }],
    [{ '2026-08-10': -2 }],
    [{ '2026-08-10': 9 }],
    [{ '2026-08-10': 2.5 }],
    [['4']],
  ])('drops a glass count that is %j', async (stored) => {
    const { hydrationGlasses } = await freshChecklist('today:hydration', stored);

    expect(hydrationGlasses.value).toBe(0);
  });
});
