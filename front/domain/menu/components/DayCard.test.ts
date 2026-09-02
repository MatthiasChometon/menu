import { renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it } from 'vitest';
import DayCard from './DayCard.vue';

const weekOf = (): string => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return latestMenu.weekOf;
};

const dayOf = (index: number): Day => {
  const day = useMenu().latestMenu?.days[index];
  if (day === undefined) throw new Error('no day to check');

  return day;
};

const flexedDayOf = (index: number): FlexedDay => {
  const day = dayOf(index);

  return {
    key: day.key,
    macros: day.macros,
    meals: day.meals.map((meal): FlexedMeal => ({ ...meal, flex: { isSwapped: false, isLeftover: false } })),
  };
};

// The i18n locale and every store the card reads from are shared across the
// test app, so each test starts from a clean, known slate. The card reads the
// week from useSelectedWeek rather than from a prop, so it has to be pointed
// at the same week the test is checking.
beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
  useSelectedWeek().selectedWeek.value = weekOf();
  useMealOverrides(weekOf()).reset();
  useMealSwap(weekOf()).reset();
});

describe('DayCard', () => {
  it('shows the day name and its total calories', async () => {
    const day = flexedDayOf(0);
    const { t } = useNuxtApp().$i18n;

    await renderSuspended(DayCard, { props: { day, targets: day.macros, defaultOpen: true } });

    expect(screen.getByText(t(`menu.day.${day.key}`))).toBeTruthy();
    expect(screen.getByText(`${Math.round(day.macros.kcal)} kcal`)).toBeTruthy();
  });

  it('marks the day off from its menu, showing the badge', async () => {
    const day = flexedDayOf(0);

    await renderSuspended(DayCard, { props: { day, targets: day.macros, defaultOpen: true } });

    await fireEvent.click(screen.getByRole('button', { name: 'Options du jour' }));
    await fireEvent.click(await screen.findByText('Marquer jour off'));

    expect(await screen.findByText('Jour off')).toBeTruthy();
    expect(
      useMealOverrides(weekOf()).isDayOff(
        day.key,
        day.meals.map((meal): MealSlot => meal.slot),
      ),
    ).toBe(true);
  });

  it('swaps with another day from its menu', async () => {
    const dayA = flexedDayOf(0);
    const dayB = dayOf(1);
    const { t } = useNuxtApp().$i18n;

    await renderSuspended(DayCard, {
      props: { day: dayA, targets: dayA.macros, defaultOpen: true, otherDayKeys: [dayB.key] },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Options du jour' }));
    await fireEvent.click(
      await screen.findByText(`Échanger avec ${t(`menu.day.${dayB.key}`)}`),
    );

    const slot = dayA.meals[0]?.slot;
    if (slot === undefined) throw new Error('the day has no meal');

    expect(useMealSwap(weekOf()).isSwapped(dayA.key, slot)).toBe(true);
  });
});
