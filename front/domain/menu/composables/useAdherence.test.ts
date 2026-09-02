import { renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';

const menuOf = (): Menu => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return latestMenu;
};

const totalMealsOf = (menu: Menu): number =>
  menu.days.reduce((total, day): number => total + day.meals.length, 0);

const firstMealOf = (menu: Menu): { day: DayKey; slot: MealSlot } => {
  const day = menu.days[0];
  const meal = day?.meals[0];
  if (day === undefined || meal === undefined) throw new Error('the week has no meal');

  return { day: day.key, slot: meal.slot };
};

// Recording only happens once a page has actually mounted (see useAdherence),
// so exercising it needs a real component instance rather than a bare call —
// a minimal host that renders the trend as a list, the way the real page does.
const hostFor = (menu: Menu): ReturnType<typeof defineComponent> =>
  defineComponent({
    setup: () => {
      const { history } = useAdherence(menu);
      return (): ReturnType<typeof h> =>
        h(
          'ul',
          history.value.map((week): ReturnType<typeof h> =>
            h('li', `${week.weekOf} ${week.eatenCount}/${week.totalCount}`),
          ),
        );
    },
  });

beforeEach((): void => {
  useCookingLog(menuOf().weekOf).reset();
});

describe('useAdherence', () => {
  it('totals every meal the week plans, whether or not it has been eaten', () => {
    const menu = menuOf();
    const { totalCount } = useAdherence(menu);

    expect(totalCount.value).toBe(totalMealsOf(menu));
  });

  it('starts with nothing eaten and a rate of zero', () => {
    const menu = menuOf();
    const { eatenCount, rate } = useAdherence(menu);

    expect(eatenCount.value).toBe(0);
    expect(rate.value).toBe(0);
  });

  it('moves the rate as meals are ticked eaten', () => {
    const menu = menuOf();
    const { eatenCount, rate, totalCount } = useAdherence(menu);
    const { day, slot } = firstMealOf(menu);

    useCookingLog(menu.weekOf).toggleEaten(day, slot);

    expect(eatenCount.value).toBe(1);
    expect(rate.value).toBeCloseTo(1 / totalCount.value);
  });

  it('reports the count as a share, not a percentage', () => {
    const menu = menuOf();
    const { rate } = useAdherence(menu);
    const { day, slot } = firstMealOf(menu);

    useCookingLog(menu.weekOf).toggleEaten(day, slot);

    expect(rate.value).toBeGreaterThan(0);
    expect(rate.value).toBeLessThanOrEqual(1);
  });

  it('remembers a week already tallied, even once it is no longer on screen', async () => {
    const base = menuOf();
    const earlierWeek: Menu = { ...base, weekOf: '2091-01-07' };
    useCookingLog(earlierWeek.weekOf).reset();
    const { day, slot } = firstMealOf(earlierWeek);
    useCookingLog(earlierWeek.weekOf).toggleEaten(day, slot);

    const first = await renderSuspended(hostFor(earlierWeek));
    first.unmount();

    const laterWeek: Menu = { ...base, weekOf: '2091-01-14' };
    await renderSuspended(hostFor(laterWeek));
    await nextTick();

    expect(screen.getByText(`2091-01-07 1/${totalMealsOf(earlierWeek)}`)).toBeTruthy();
  });

  it('keeps only the four most recently tallied weeks', async () => {
    const base = menuOf();
    const weeks = ['2099-01-01', '2099-01-08', '2099-01-15', '2099-01-22', '2099-01-29'];

    for (const weekOf of weeks) {
      useCookingLog(weekOf).reset();
      const rendered = await renderSuspended(hostFor({ ...base, weekOf }));
      if (weekOf !== weeks.at(-1)) rendered.unmount();
    }
    await nextTick();

    const items = screen.getAllByRole('listitem').map((item): string | null => item.textContent);
    expect(items.map((text): string | undefined => text?.split(' ')[0])).toEqual(weeks.slice(-4));
  });
});
