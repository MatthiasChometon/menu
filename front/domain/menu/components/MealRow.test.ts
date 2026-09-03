import { renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it } from 'vitest';
import MealRow from './MealRow.vue';

const weekOf = (): string => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return latestMenu.weekOf;
};

const mealOf = (): Meal => {
  const meal = useMenu().latestMenu?.days[0]?.meals[0];
  if (meal === undefined) throw new Error('no meal to check');

  return meal;
};

const flexedMeal = (flex: Partial<MealFlex> = {}): FlexedMeal => ({
  ...mealOf(),
  flex: { isSwapped: false, isLeftover: false, ...flex },
});

// The i18n locale and every store this row reads from are shared across the
// test app, so each test starts from a clean, known slate. The row reads the
// week from useSelectedWeek rather than from a prop (like the real page),
// so it has to be pointed at the same week the test is checking.
beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
  useSelectedWeek().selectedWeek.value = weekOf();
  useCookingLog(weekOf()).reset();
  useMealOverrides(weekOf()).reset();
  useLeftovers(weekOf()).reset();
});

describe('MealRow', () => {
  it('shows the eaten toggle for a meal still on the plan', async () => {
    await renderSuspended(MealRow, { props: { meal: flexedMeal(), dayKey: 'monday' } });

    expect(screen.getByRole('button', { name: 'Marquer ce repas comme mangé' })).toBeTruthy();
  });

  it('strikes the name and hides the eaten toggle for a meal eaten out', async () => {
    await renderSuspended(MealRow, {
      props: { meal: flexedMeal({ excludedAs: 'eatingOut' }), dayKey: 'monday' },
    });

    expect(screen.getByText('Hors plan')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Marquer ce repas comme mangé' })).toBeNull();
  });

  it('shows a badge for an assumed cheat meal', async () => {
    await renderSuspended(MealRow, {
      props: { meal: flexedMeal({ excludedAs: 'cheatMeal' }), dayKey: 'monday' },
    });

    expect(screen.getByText('Écart assumé')).toBeTruthy();
  });

  it('shows a badge when the slot was swapped with another day', async () => {
    await renderSuspended(MealRow, {
      props: { meal: flexedMeal({ isSwapped: true }), dayKey: 'monday' },
    });

    expect(screen.getByText('Échangé')).toBeTruthy();
  });

  it("shows a badge when the meal is yesterday's leftovers", async () => {
    await renderSuspended(MealRow, {
      props: { meal: flexedMeal({ isLeftover: true }), dayKey: 'monday' },
    });

    expect(screen.getByText("Restes d'hier")).toBeTruthy();
  });

  it('offers a leftover suggestion and records accepting it', async () => {
    const meal = mealOf();

    await renderSuspended(MealRow, {
      props: { meal: flexedMeal({ suggestedLeftover: meal }), dayKey: 'tuesday' },
    });

    expect(screen.getByText("Restes d'hier disponibles :")).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Manger les restes' }));

    expect(useLeftovers(weekOf()).decisionAt('tuesday', meal.slot)).toBe('used');
  });

  it('offers a leftover suggestion and records declining it', async () => {
    const meal = mealOf();

    await renderSuspended(MealRow, {
      props: { meal: flexedMeal({ suggestedLeftover: meal }), dayKey: 'tuesday' },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Non merci' }));

    expect(useLeftovers(weekOf()).decisionAt('tuesday', meal.slot)).toBe('declined');
  });

  it('sends this dish leftovers to a slot chosen on purpose', async () => {
    const meal = mealOf();
    const { t } = useNuxtApp().$i18n;

    await renderSuspended(MealRow, {
      props: { meal: flexedMeal(), dayKey: 'monday', leftoverTargets: ['thursday'] },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Options du repas' }));
    await fireEvent.click(
      await screen.findByText(`Garder des restes pour ${t('menu.day.thursday')}`),
    );

    expect(useLeftovers(weekOf()).assignedTargetOf('monday', meal.slot)).toEqual({
      day: 'thursday',
      slot: meal.slot,
    });
  });

  it('cancels a leftover already reserved for a chosen slot', async () => {
    const meal = mealOf();
    const { t } = useNuxtApp().$i18n;

    useLeftovers(weekOf()).assignLeftover('monday', meal.slot, 'thursday', meal.slot);

    await renderSuspended(MealRow, { props: { meal: flexedMeal(), dayKey: 'monday' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Options du repas' }));
    await fireEvent.click(
      await screen.findByText(`Restes réservés pour ${t('menu.day.thursday')}`),
    );

    expect(useLeftovers(weekOf()).assignedTargetOf('monday', meal.slot)).toBeUndefined();
  });

  it('stops a leftover assigned to this slot on purpose, without touching decisions', async () => {
    const meal = mealOf();

    useLeftovers(weekOf()).assignLeftover('sunday', meal.slot, 'monday', meal.slot);

    await renderSuspended(MealRow, {
      props: { meal: flexedMeal({ isLeftover: true }), dayKey: 'monday' },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Options du repas' }));
    await fireEvent.click(await screen.findByText('Revenir au plat prévu'));

    expect(useLeftovers(weekOf()).assignedOriginOf('monday', meal.slot)).toBeUndefined();
  });
});
